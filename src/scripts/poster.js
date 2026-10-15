// Ported 1:1 from the original single-file HTML.
// Inline onclick/oninput handlers in the markup call these, so they are exposed on window.
// html2canvas and Cropper are loaded as globals from the CDN scripts in Layout.astro.

// --- CONFIGURATION ---
const SITE_LOGO_URL = "https://cdn-icons-png.flaticon.com/512/2917/2917995.png"; 

// --- DEFAULT FEED OPACITY SETTINGS (Change here) ---
const FEED_OPACITY_BOTTOM = 0.5; // Lower part darkness (0.0 to 1.0)
const FEED_OPACITY_TOP = 0;    // Upper part darkness

// --- CUSTOM IMAGE SOURCE ---
// Yaha apni images ke link dalein. Example: "images/photo1.jpg"
const MY_GALLERY_IMAGES = [ 
    "https://guglaa.com/img/20250130_120410-1024x1024.jpg",  
    "https://guglaa.com/img/20250130_120829-1024x1024.jpg", 
    // ... more links
];

let cropper; 

// State
let user = { 
    name: "Aesthetic Creator", 
    extra: "Poster Artist", 
    contact: "9876543210", 
    pic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    logo: "", 
    socials: { 
        visible: true,
        insta: { val: "", visible: true },
        twitter: { val: "", visible: true },
        fb: { val: "", visible: true }
    }
};

// Global style state
let currentOpacity = 0.8;
let currentBgIndex = 0;
let currentShapeIndex = 0;
let currentFilterIndex = 0;

const profileBackgrounds = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400",
    "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=400",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=400",
    "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&q=80&w=400",
    "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=400",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400"
];

const profileShapes = ['rounded-full', 'rounded-none', 'rounded-2xl'];
const filters = ['', 'grayscale(100%)', 'sepia(80%)', 'contrast(150%)', 'hue-rotate(45deg)'];

const fonts = ['font-poppins', 'font-playfair', 'font-meow-script', 'font-pacifico', 'font-quicksand'];

document.addEventListener('DOMContentLoaded', () => {
    // PWA Setup Call
    setupPWA();

    const saved = localStorage.getItem('aestheticUser');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.socials && typeof parsed.socials.insta === 'string') {
            user = {
                ...parsed,
                socials: {
                    visible: true,
                    insta: { val: parsed.socials.insta, visible: true },
                    twitter: { val: parsed.socials.twitter, visible: true },
                    fb: { val: parsed.socials.fb, visible: true }
                }
            };
        } else {
            user = parsed;
        }
        startApp();
    } else {
        document.getElementById('userDetailsModal').classList.remove('hidden');
    }
    
    const pInput = document.getElementById('profilePicInput');
    if(pInput) {
        pInput.addEventListener('change', handleFileSelect);
    }
    
    const uInput = document.getElementById('updateProfilePicInput');
    if(uInput) {
        uInput.addEventListener('change', handleFileSelect);
    }

    // NEW: Logo Input
    const lInput = document.getElementById('logoInput');
    if(lInput) {
        lInput.addEventListener('change', handleLogoSelect);
    }

    loadFeed();
});

// --- PWA SETUP LOGIC ---
let deferredPrompt;

function setupPWA() {
    // 1. Generate Manifest Dynamically
    const manifest = {
        "name": "Posty Poster Maker",
        "short_name": "Posty",
        "start_url": ".",
        "display": "standalone",
        "background_color": "#f0fdf4",
        "theme_color": "#10b981",
        "orientation": "portrait",
        "icons": [
            {
                "src": "https://cdn-icons-png.flaticon.com/512/2917/2917995.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "https://cdn-icons-png.flaticon.com/512/2917/2917995.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    };
    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    document.getElementById('manifest-link').setAttribute('href', manifestURL);

    // 2. Register Service Worker (Blob to bypass separate file requirement)
    if ('serviceWorker' in navigator) {
        const swCode = `
            self.addEventListener('install', (e) => {
                self.skipWaiting();
            });
            self.addEventListener('fetch', (e) => {
                // Simple pass-through or caching logic here
                // e.respondWith(fetch(e.request));
            });
        `;
        const swBlob = new Blob([swCode], {type: 'application/javascript'});
        const swUrl = URL.createObjectURL(swBlob);
        navigator.serviceWorker.register(swUrl)
            .then(() => console.log('Service Worker Registered'))
            .catch((err) => console.log('SW Error:', err));
    }

    // 3. Handle Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        checkDisplayMode(); // Show banner if appropriate
    });

    // 4. Initial Display Check
    checkDisplayMode();

    // 5. Wire up Install Button
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            document.getElementById('installBanner').classList.add('hidden');
        } else {
            // Fallback for when prompt isn't ready or already installed
            alert('To install: Tap Share icon in browser menu -> Add to Home Screen');
        }
    });

    // 6. Listen for successful install
    window.addEventListener('appinstalled', () => {
        document.getElementById('installBanner').classList.add('hidden');
        console.log('PWA was installed');
    });
}

function checkDisplayMode() {
    // Check if running in standalone (app) mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    
    if (isStandalone) {
        // App is installed and running
        document.getElementById('installBanner').classList.add('hidden');
    } else {
        // App is running in browser -> Show Banner
        // We default to showing it via JS to ensure it's hidden in app mode
        document.getElementById('installBanner').classList.remove('hidden');
        document.getElementById('installBanner').classList.add('flex'); // Ensure flex display
    }
}

// NEW: History API Logic
window.addEventListener('popstate', () => {
    const modal = document.getElementById('modal');
    if (modal && !modal.classList.contains('hidden')) {
        hideModalUI();
    }
});

function hideModalUI() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('floatingButtonsContainer').classList.add('hidden');
    document.getElementById('bottom-nav').classList.remove('hidden');
    const panels = ['fontListPanel', 'alignmentPanel', 'adjustmentsPanel', 'qualityPopup', 'textEditPanel', 'socialsEditPanel', 'cropperModal', 'imageActionModal'];
    panels.forEach(p => {
        const el = document.getElementById(p);
        if(el) el.classList.add('hidden');
    });
}

function openImageActionModal() {
    document.getElementById('imageActionModal').classList.remove('hidden');
}

function closeActionModal() {
    document.getElementById('imageActionModal').classList.add('hidden');
}

function triggerFileUpload() {
    closeActionModal();
    const input = document.getElementById('updateProfilePicInput');
    if(input) input.click();
}

function triggerManualCrop() {
    closeActionModal();
    openCropper(user.pic); 
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target.result;
            updateAppImage(result);
        };
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function handleLogoSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target.result;
            document.getElementById('previewLogo').src = result;
        };
        reader.readAsDataURL(file);
    }
}

function updateAppImage(src) {
    user.pic = src;
    const modalPic = document.getElementById('modalProfilePic');
    if(modalPic) modalPic.src = src;
    
    const previewPic = document.getElementById('previewProfilePic');
    if(previewPic) previewPic.src = src;
    
    const navPic = document.getElementById('navUserPic');
    if(navPic) navPic.src = src;
    
    localStorage.setItem('aestheticUser', JSON.stringify(user));
}

function initManualCrop() {
    openCropper(user.pic);
}

function openCropper(imageSrc) {
    const modal = document.getElementById('cropperModal');
    const image = document.getElementById('imageToCrop');
    
    if(image && modal) {
        image.src = imageSrc;
        modal.classList.remove('hidden');
        
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(image, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8, 
            restore: false,
            guides: false,
            center: true,
            highlight: false,
            cropBoxMovable: false,
            cropBoxResizable: false,
            toggleDragModeOnDblclick: false,
            ready: function() {
                if(this.cropper) {
                    this.cropper.reset();
                }
            }
        });
    }
}

function cancelCrop() {
    const image = document.getElementById('imageToCrop');
    if(image && image.src) {
          updateAppImage(image.src);
    }

    const modal = document.getElementById('cropperModal');
    if(modal) modal.classList.add('hidden');
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

function performCrop() {
    if (!cropper) return;
    
    const canvas = cropper.getCroppedCanvas({
        width: 300, 
        height: 300,
    });
    
    const croppedImage = canvas.toDataURL('image/png');
    updateAppImage(croppedImage);
    
    const modal = document.getElementById('cropperModal');
    if(modal) modal.classList.add('hidden');
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// --- NEW SEPARATE FUNCTION FOR PROFILE SETUP ---
// Doesn't touch editor state, just saves initial config
function saveUserSetup() {
    const nameInput = document.getElementById('userNameInput');
    if(!nameInput || !nameInput.value.trim()) return;
    
    user.name = nameInput.value.trim();
    user.extra = document.getElementById('professionInput').value.trim() || "Digital Creator";
    user.contact = document.getElementById('mobileInput').value.trim() || "";
    
    const preview = document.getElementById('previewProfilePic');
    if (!user.pic && preview) user.pic = preview.src;

    const logoPreview = document.getElementById('previewLogo');
    if(logoPreview && logoPreview.src !== SITE_LOGO_URL) {
         user.logo = logoPreview.src;
    }

    // Get Toggle Value (Initial Setup)
    const setupToggle = document.getElementById('setupSocialsToggle');
    const isSocialsVisible = setupToggle ? setupToggle.checked : true;

    // PRESERVE existing platform visibility if possible, otherwise default to true
    const prevInsta = user.socials && user.socials.insta ? user.socials.insta.visible : true;
    const prevTwitter = user.socials && user.socials.twitter ? user.socials.twitter.visible : true;
    const prevFb = user.socials && user.socials.fb ? user.socials.fb.visible : true;

    user.socials = { 
        visible: isSocialsVisible,
        insta: { val: document.getElementById('instaInput').value.trim(), visible: prevInsta }, 
        twitter: { val: document.getElementById('twitterInput').value.trim(), visible: prevTwitter }, 
        fb: { val: document.getElementById('fbInput').value.trim(), visible: prevFb } 
    };
    
    localStorage.setItem('aestheticUser', JSON.stringify(user));
    document.getElementById('userDetailsModal').classList.add('hidden');
    startApp();
    
    // Reload feed to apply new user details to presets
    loadFeed();
}

function startApp() {
    document.getElementById('mainNav').classList.remove('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    const navName = document.getElementById('navUserName');
    if(navName) navName.innerText = user.name;
    
    const navPic = document.getElementById('navUserPic');
    if(navPic) navPic.src = user.pic;
}

// --- NEW FEED LOGIC: Pre-styled Posters ---
function loadFeed() {
    const gallery = document.getElementById('gallery');
    if(!gallery) return;
    
    let images = [];
    
    // Step 1: Check if user has provided custom images
    if (MY_GALLERY_IMAGES.length > 0) {
        images = MY_GALLERY_IMAGES;
    } 
    // Step 2: Fallback to Cache or Random Picsum
    else {
        const cachedFeed = localStorage.getItem('aestheticFeedCache');
        if (cachedFeed) {
            images = JSON.parse(cachedFeed);
        } else {
            images = Array.from({length: 24}, (_, i) => `https://picsum.photos/id/${i + 60}/600/800`);
            localStorage.setItem('aestheticFeedCache', JSON.stringify(images));
        }
    }
    
    // Randomize feed order slightly on reload
    images = images.sort(() => Math.random() - 0.5);

    gallery.innerHTML = ''; 
    
    // Generate Feed Items
    images.forEach((url, index) => {
        const itemID = `feed-item-${index}`;
        
        // 1. Random Alignment (Left, Center, Right)
        const themes = ['theme-left', 'theme-center', 'theme-right'];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        
        // 2. Random Banner Background
        const randomBg = profileBackgrounds[Math.floor(Math.random() * profileBackgrounds.length)];
        
        // 3. Logo Alignment logic - ALWAYS Top Right
        let logoClass = "absolute top-2 right-2"; 

        // 4. Random Font
        const randomFont = fonts[Math.floor(Math.random() * fonts.length)];

        const div = document.createElement('div');
        div.className = 'gallery-item'; // Removed Pulse for smooth snap logic
        div.id = itemID; // Important for capture
        
        div.innerHTML = getPosterHTML(url, randomTheme, randomBg, logoClass, randomFont, index);
        gallery.appendChild(div);
    });
    
    document.getElementById('loadingGallery').classList.add('hidden');
}

// --- UNIFIED POSTER HTML GENERATOR (UPDATED FOR CARD LOOK) ---
function getPosterHTML(url, theme, bg, logoClass, fontClass, index) {
    let socialsHTML = '';
    
    if (user.socials.visible) { 
         const anyPlatformVisible = user.socials.insta.visible || user.socials.twitter.visible || user.socials.fb.visible;
         
         if(anyPlatformVisible) {
              socialsHTML += `
                <p class="text-[8px] font-bold opacity-80 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                    Follow Me <i class="fas fa-pen text-[8px] opacity-50 capture-hide"></i>
                </p>
                <div class="social-inner-block flex flex-col gap-0.5 text-[9px] font-medium opacity-90">
             `;
             
             if(user.socials.insta.visible) {
                  const val = user.socials.insta.val;
                  if(val) socialsHTML += `<div class="info-row"><i class="fab fa-instagram fw-icon"></i> <span>${val}</span></div>`;
                  else socialsHTML += `<div class="info-row"><i class="fab fa-instagram opacity-60 fw-icon"></i></div>`;
              }
              
              if(user.socials.twitter.visible) {
                  const val = user.socials.twitter.val;
                  if(val) socialsHTML += `<div class="info-row"><i class="fab fa-twitter fw-icon"></i> <span>${val}</span></div>`;
                  else socialsHTML += `<div class="info-row"><i class="fab fa-twitter opacity-60 fw-icon"></i></div>`;
              }

             if(user.socials.fb.visible) {
                  const val = user.socials.fb.val;
                  if(val) socialsHTML += `<div class="info-row"><i class="fab fa-facebook-f fw-icon"></i> <span>${val}</span></div>`;
                  else socialsHTML += `<div class="info-row"><i class="fab fa-facebook-f opacity-60 fw-icon"></i></div>`;
              }
              
              socialsHTML += `</div>`;
          }
    }

    const fontClassToUse = fontClass || '';

    // WRAPPER ADDED: .poster-card-wrapper to create the card look inside the slide
    return `
        <div class="poster-card-wrapper relative"> 
            <div id="print-area-${index}" class="poster-capture-area relative w-full" onclick="openEditor('${url}')">
                <!-- Image Container (Logo/Watermark sits here) -->
                <div class="relative w-full h-full">
                    <!-- CHANGED: Removed aspect-ratio and object-cover to prevent cropping -->
                    <img 
                        src="${url}" 
                        loading="lazy" 
                        class="main-img w-full block"
                        alt="Aesthetic Inspiration"
                        onload="handleImageLoad(this)"
                        crossorigin="anonymous"
                    >
                    <!-- Fixed Logo Top Right -->
                    <img src="${user.logo || SITE_LOGO_URL}" class="absolute top-2 right-2 w-12 h-12 object-contain drop-shadow-xl z-30 transition-all duration-300" crossorigin="anonymous">
                    <!-- Fixed Watermark Bottom Left -->
                    <!-- UPDATED: Background on parent div, text inside -->
                    <div class="absolute bottom-2 left-2 z-30 pointer-events-none bg-black/40 px-3 py-1 rounded-full backdrop-blur-[1px]">
                        <span class="text-[7px] text-white font-quicksand font-bold tracking-[0.3em] uppercase drop-shadow-md">Generated By Mysite.com</span>
                    </div>
                </div>
                
                <!-- Overlay Block (User Card Below Image) -->
                <!-- Updated Opacity Logic for Feed Items -->
                <div class="poster-overlay-container ${theme}" 
                       style="background: linear-gradient(to top, rgba(0,0,0,${FEED_OPACITY_BOTTOM}), rgba(0,0,0,${FEED_OPACITY_TOP})), url('${bg}');">
                      
                    <div class="profile-group">
                        <div class="profile-pic-container shrink-0">
                            <img src="${user.pic}" class="w-14 h-14 rounded-full border-2 border-white/50 shadow-lg object-cover bg-white">
                        </div>
                        <!-- Added Font Class Here and mb-1 to h3 -->
                        <div class="profile-text flex flex-col justify-center ${fontClassToUse}">
                            <h3 class="modal-profile-name font-bold text-lg leading-none drop-shadow-md mb-1">${user.name}</h3>
                            <div class="details-block">
                                <div class="info-row"><i class="fas fa-briefcase fw-icon"></i> ${user.extra}</div>
                                <div class="info-row"><i class="fab fa-whatsapp fw-icon"></i> ${user.contact}</div>
                            </div>
                        </div> 
                    </div>
                      
                    <div class="social-group">
                            ${socialsHTML}
                     </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="action-bar poster-actions-area bg-white p-3 border-t border-gray-100 flex justify-between items-center mt-auto">
                <div class="flex items-center gap-1 text-emerald-600 text-xs font-bold italic cursor-pointer hover:underline" onclick="openEditor('${url}')">
                    <i class="fas fa-magic"></i> Tap to Edit
                </div>
                <div class="flex gap-2">
                    <button onclick="shareFeedItem(this.closest('.gallery-item').querySelector('.poster-capture-area').id)" class="bg-emerald-50 text-emerald-600 p-2 rounded-full hover:bg-emerald-100 transition shadow-sm w-9 h-9 flex items-center justify-center">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button onclick="downloadFeedItem(this.closest('.gallery-item').querySelector('.poster-capture-area').id, this)" class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-2 rounded-full hover:scale-105 transition shadow-md w-9 h-9 flex items-center justify-center">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function downloadFeedItem(containerId, btn) {
    // Target SPECIFICALLY the capture area div, not the whole card
    const captureTarget = document.getElementById(containerId);
    const originalIcon = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i>';
    
    try {
        const canvas = await html2canvas(captureTarget, {
            scale: 3, 
            useCORS: true,
            allowTaint: false,
            backgroundColor: null,
            onclone: (clonedDoc) => {
                const clonedWrapper = clonedDoc.getElementById(containerId);
                // FORCE SQUARE CORNERS IN CLONE
                clonedWrapper.style.borderRadius = '0';
                clonedWrapper.style.borderTopLeftRadius = '0';
                clonedWrapper.style.borderTopRightRadius = '0';
                // REMOVE BORDER AND SHADOW TO PREVENT WHITE LINES
                clonedWrapper.style.border = 'none';
                clonedWrapper.style.boxShadow = 'none';
            }
        });
        
        const link = document.createElement('a');
        link.download = `aesthetic-post-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    } catch (err) {
        console.error("Download failed", err);
        alert("Could not download image. Try opening it first.");
    } finally {
        btn.innerHTML = originalIcon;
    }
}

async function shareFeedItem(containerId) {
    const captureTarget = document.getElementById(containerId);
    
    try {
        const canvas = await html2canvas(captureTarget, { scale: 2, useCORS: true });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'poster.png', { type: 'image/png' });
            if (navigator.share) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Check out this design!'
                    });
                } catch (err) {}
            } else {
                alert("Sharing not supported on this browser.");
            }
        });
    } catch (err) {}
}

function handleImageLoad(img) {
    img.classList.add('loaded');
    img.closest('.gallery-item').classList.remove('pulse');
}

// --- NAME AUTO-FIT LOGIC ---
function adjustNameSize() {
    const nameEl = document.getElementById('modalProfileName');
    if(!nameEl) return;
    
    nameEl.style.fontSize = '20px'; 
    let currentSize = 20;
    const minSize = 10;
    
    while (nameEl.scrollWidth > nameEl.offsetWidth && currentSize > minSize) {
        currentSize -= 0.5;
        nameEl.style.fontSize = `${currentSize}px`;
    }
}

function openEditor(src) {
    const modal = document.getElementById('modal');
    document.getElementById('modalImage').src = src;
    
    document.getElementById('modalProfileName').innerText = user.name;
    document.getElementById('modalProfileExtra').innerText = user.extra;
    document.getElementById('modalProfileContact').innerText = user.contact;
    document.getElementById('modalProfilePic').src = user.pic;

    renderSocials();

    const currentTheme = document.getElementById('profileOverlay').classList.contains('theme-right') ? 'right' : 
                          document.getElementById('profileOverlay').classList.contains('theme-center') ? 'center' : 'left';
    setTheme(currentTheme);

    const logoImg = document.getElementById('userLogoImg');
    if(logoImg) logoImg.src = user.logo || SITE_LOGO_URL;

    changeProfileBackground();
    
    // Reset sliders to current defaults if needed
    document.getElementById('cardOpacitySlider').value = currentOpacity * 100;
    document.getElementById('opacityValueDisplay').innerText = Math.round(currentOpacity * 100) + '%';

    modal.classList.remove('hidden');
    document.getElementById('floatingButtonsContainer').classList.remove('hidden');
    document.getElementById('bottom-nav').classList.add('hidden');
    
    setTimeout(adjustNameSize, 50); 

    window.history.pushState({ editorOpen: true }, "");
}

function renderSocials() {
    const socialsContainer = document.getElementById('socialsContainer');
    // Specific selector for the modal's social section to avoid conflict with Feed Items
    const mainSection = document.querySelector('#profileOverlay .social-media-section');
    
    if (!mainSection) return;

    const anyVisible = user.socials.insta.visible || user.socials.twitter.visible || user.socials.fb.visible;
    
    // Check if we should hide
    if (!user.socials.visible || !anyVisible) {
        mainSection.classList.add('hidden');
        mainSection.style.display = 'none'; // Force hide to override any flex styles
    } else {
        mainSection.classList.remove('hidden');
        mainSection.style.display = ''; // Remove inline style to let CSS take over
    }

    socialsContainer.innerHTML = '';
    
    // Add Follow Me Header
    let headerHTML = `<p class="text-[8px] font-bold opacity-80 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                    Follow Me <i class="fas fa-pen text-[8px] opacity-50 capture-hide"></i>
                </p>`;
    
    // Add Items Container
    let itemsHTML = `<div class="social-inner-block flex flex-col gap-0.5 text-[9px] font-medium opacity-90">`;

    const platforms = [
        { id: 'insta', icon: 'fab fa-instagram', data: user.socials?.insta },
        { id: 'twitter', icon: 'fab fa-twitter', data: user.socials?.twitter },
        { id: 'fb', icon: 'fab fa-facebook-f', data: user.socials?.fb }
    ];

    platforms.forEach(p => {
        if (!p.data.visible) return;

        const hasText = p.data.val && p.data.val.length > 0;
        let row = '';
        if(hasText) {
            row = `<div class="info-row"><i class="${p.icon} fw-icon"></i> <span>${p.data.val}</span></div>`;
        } else {
            row = `<div class="info-row"><i class="${p.icon} opacity-60 fw-icon"></i></div>`;
        }
        itemsHTML += row;
    });
    
    itemsHTML += `</div>`;
    
    socialsContainer.innerHTML = itemsHTML;
}

function editSocials() {
    const panel = document.getElementById('socialsEditPanel');
    
    document.getElementById('editInstaInput').value = user.socials?.insta?.val || '';
    document.getElementById('editTwitterInput').value = user.socials?.twitter?.val || '';
    document.getElementById('editFbInput').value = user.socials?.fb?.val || '';
    
    // Use Editor Specific functions/IDs
    updateToggleButton('editorSocialsToggle', user.socials.visible);
    updateToggleButton('btn-insta', user.socials.insta.visible);
    updateToggleButton('btn-twitter', user.socials.twitter.visible);
    updateToggleButton('btn-fb', user.socials.fb.visible);

    const panels = ['fontListPanel', 'alignmentPanel', 'adjustmentsPanel', 'qualityPopup', 'textEditPanel', 'imageActionModal'];
    panels.forEach(p => {
        const el = document.getElementById(p);
        if(el) el.classList.add('hidden');
    });
    
    panel.classList.remove('hidden');
}

function updateToggleButton(btnId, isVisible) {
    const btn = document.getElementById(btnId);
    if(!btn) return;
    const icon = btn.querySelector('i');
    if (isVisible) {
        icon.className = 'fas fa-eye';
        btn.classList.remove('text-red-400', 'border-red-100', 'bg-red-50');
        if(btnId !== 'editorSocialsToggle') btn.classList.add('text-emerald-400');
    } else {
        icon.className = 'fas fa-eye-slash';
        if(btnId !== 'editorSocialsToggle') {
            btn.classList.add('text-red-400', 'border-red-100', 'bg-red-50');
            btn.classList.remove('text-emerald-400');
        }
    }
}

// --- SEPARATE TOGGLE LOGIC FOR EDITOR ---
function toggleEditorSocials() {
    user.socials.visible = !user.socials.visible;
    updateToggleButton('editorSocialsToggle', user.socials.visible);
    renderSocials(); 
}

function toggleEditorPlatform(platform) {
    user.socials[platform].visible = !user.socials[platform].visible;
    updateToggleButton(`btn-${platform}`, user.socials[platform].visible);
    renderSocials();
}

function saveSocials() {
    user.socials.insta.val = document.getElementById('editInstaInput').value;
    user.socials.twitter.val = document.getElementById('editTwitterInput').value;
    user.socials.fb.val = document.getElementById('editFbInput').value;
    
    localStorage.setItem('aestheticUser', JSON.stringify(user));
    renderSocials();
    document.getElementById('socialsEditPanel').classList.add('hidden');
}

function closeModal() {
    if (window.history.state && window.history.state.editorOpen) {
        window.history.back(); 
    } else {
        hideModalUI(); 
    }
}

function togglePanel(id) {
    const panel = document.getElementById(id);
    const panels = ['fontListPanel', 'alignmentPanel', 'adjustmentsPanel', 'qualityPopup', 'textEditPanel', 'socialsEditPanel', 'imageActionModal'];
    
    if (panel && panel.classList.contains('hidden')) {
        panels.forEach(p => {
            const el = document.getElementById(p);
            if(el) el.classList.add('hidden');
        });
        panel.classList.remove('hidden');
    } else if (panel) {
        panel.classList.add('hidden');
    }
}

function selectFont(fontClass) {
    // Target only the modal's profile text container
    const target = document.querySelector('#modal .profile-text');
    if (!target) return;

    // Remove all existing font classes
    target.classList.remove('font-poppins', 'font-playfair', 'font-meow-script', 'font-pacifico', 'font-quicksand');

    // Add the new one
    target.classList.add(fontClass);

    setTimeout(adjustNameSize, 50);
}

function setTheme(alignment) {
    const overlay = document.getElementById('profileOverlay');
    // const logo = document.getElementById('userLogoImg'); // Logo is fixed now
    
    overlay.classList.remove('theme-left', 'theme-right', 'theme-center');
    overlay.classList.add('theme-' + alignment);

    // No logo movement logic needed as it is fixed
    
    setTimeout(adjustNameSize, 50);
}

function updateProfileSize(val) {
    const pic = document.getElementById('modalProfilePic');
    pic.style.width = val + 'px';
    pic.style.height = val + 'px';
    document.getElementById('sizeValueDisplay').innerText = val + 'px';
}

// New function to update opacity
function updateCardOpacity(val) {
    currentOpacity = val / 100;
    document.getElementById('opacityValueDisplay').innerText = val + '%';
    
    const overlay = document.getElementById('profileOverlay');
    // Reconstruct background string with current image and new opacity
    // Standard gradient: darker at bottom
    overlay.style.background = `linear-gradient(to top, rgba(0,0,0,${currentOpacity}), rgba(0,0,0,${currentOpacity * 0.6})), url('${profileBackgrounds[currentBgIndex]}')`;
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundPosition = 'center';
}

function changeProfileShape() {
    currentShapeIndex = (currentShapeIndex + 1) % profileShapes.length;
    const pic = document.getElementById('modalProfilePic');
    pic.classList.remove('rounded-full', 'rounded-none', 'rounded-2xl');
    pic.classList.add(profileShapes[currentShapeIndex]);
}

function applyFilter() {
    currentFilterIndex = (currentFilterIndex + 1) % filters.length;
    document.getElementById('modalImage').style.filter = filters[currentFilterIndex];
}

function changeProfileBackground() {
    currentBgIndex = (currentBgIndex + 1) % profileBackgrounds.length;
    const overlay = document.getElementById('profileOverlay');
    // Use currentOpacity when changing background
    overlay.style.background = `linear-gradient(to top, rgba(0,0,0,${currentOpacity}), rgba(0,0,0,${currentOpacity * 0.6})), url('${profileBackgrounds[currentBgIndex]}')`;
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundPosition = 'center';
}

async function sharePoster() {
    const captureArea = document.getElementById('captureArea');
    try {
        const canvas = await html2canvas(captureArea, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: null,
            onclone: (clonedDoc) => {
                const hiddenElements = clonedDoc.querySelectorAll('.capture-hide');
                hiddenElements.forEach(el => el.style.display = 'none');
            }
        });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'poster.png', { type: 'image/png' });
            if (navigator.share) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Look at my Aesthetic Poster! ✨'
                    });
                } catch (err) {}
            }
        });
    } catch (err) {}
}

// UPDATED: downloadPoster now accepts the button element and animates IT, instead of the floating button
async function downloadPoster(scale, btn) {
    // Save original state
    const originalText = btn.innerHTML;
    const originalClass = btn.className;
    
    // Loading State - Use exact spinner markup
    btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Saving...';
    btn.classList.add('opacity-75', 'cursor-wait');
    btn.disabled = true;

    const captureArea = document.getElementById('captureArea');

    try {
        const canvas = await html2canvas(captureArea, {
            scale: scale,
            useCORS: true,
            allowTaint: false,
            backgroundColor: null,
            onclone: (clonedDoc) => {
                const hiddenElements = clonedDoc.querySelectorAll('.capture-hide');
                hiddenElements.forEach(el => el.style.display = 'none');
                
                // Fix for modal download too
                const captureDiv = clonedDoc.getElementById('captureArea');
                if(captureDiv) {
                     captureDiv.style.border = 'none';
                     captureDiv.style.boxShadow = 'none';
                     captureDiv.style.borderRadius = '0';
                }
            }
        });
        
        const link = document.createElement('a');
        link.download = `poster-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        // Success Feedback
        btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
        
        // Close after brief delay
        setTimeout(() => {
            togglePanel('qualityPopup');
            btn.innerHTML = originalText;
            btn.className = originalClass;
            btn.disabled = false;
        }, 1000);

    } catch (err) {
        console.error("Download failed", err);
        btn.innerHTML = '<i class="fas fa-times"></i> Error';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.className = originalClass;
            btn.disabled = false;
        }, 2000);
    }
}

let activeEditId = null;
function editProfileText(id) {
    activeEditId = id;
    const input = document.getElementById('textEditInput');
    input.value = document.getElementById(id).innerText;
    document.getElementById('textEditPanel').classList.remove('hidden');
    input.focus();
}

function saveProfileText() {
    if(activeEditId) {
        document.getElementById(activeEditId).innerText = document.getElementById('textEditInput').value;
    }
    document.getElementById('textEditPanel').classList.add('hidden');
    
    if(activeEditId === 'modalProfileName') {
        adjustNameSize();
    }
}

function showDownloadOptions() {
    togglePanel('qualityPopup');
}

function toggleEditProfilePopup() {
    const modal = document.getElementById('userDetailsModal');
    if(modal.classList.contains('hidden')) {
        document.getElementById('userNameInput').value = user.name;
        document.getElementById('professionInput').value = user.extra || "";
        document.getElementById('mobileInput').value = user.contact || "";
        
        document.getElementById('instaInput').value = user.socials?.insta?.val || "";
        document.getElementById('twitterInput').value = user.socials?.twitter?.val || "";
        document.getElementById('fbInput').value = user.socials?.fb?.val || "";

        const logoPreview = document.getElementById('previewLogo');
        if(logoPreview) logoPreview.src = user.logo || SITE_LOGO_URL;
        
        // NEW: Use SETUP specific ID
        const followToggle = document.getElementById('setupSocialsToggle');
        if(followToggle) {
            followToggle.checked = user.socials && user.socials.visible !== undefined ? user.socials.visible : true;
        }
        
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

Object.assign(window, {
  setupPWA,
  checkDisplayMode,
  hideModalUI,
  openImageActionModal,
  closeActionModal,
  triggerFileUpload,
  triggerManualCrop,
  handleFileSelect,
  handleLogoSelect,
  updateAppImage,
  initManualCrop,
  openCropper,
  cancelCrop,
  performCrop,
  saveUserSetup,
  startApp,
  loadFeed,
  getPosterHTML,
  downloadFeedItem,
  shareFeedItem,
  handleImageLoad,
  adjustNameSize,
  openEditor,
  renderSocials,
  editSocials,
  updateToggleButton,
  toggleEditorSocials,
  toggleEditorPlatform,
  saveSocials,
  closeModal,
  togglePanel,
  selectFont,
  setTheme,
  updateProfileSize,
  updateCardOpacity,
  changeProfileShape,
  applyFilter,
  changeProfileBackground,
  sharePoster,
  downloadPoster,
  editProfileText,
  saveProfileText,
  showDownloadOptions,
  toggleEditProfilePopup
});
