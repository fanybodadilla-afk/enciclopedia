/**
 * Objeto principal de la aplicación para encapsular toda la lógica.
 * Esto evita la contaminación del espacio de nombres global.
 */
const App = {
    // 1. ESTADO Y CONFIGURACIÓN
    state: {
        mainContent: null,
        colorInterval: null,
        comparisonList: [], // Nuevo: para la herramienta de comparación
        logosAnimados: [],
        favorites: [], // Nuevo: para guardar los IDs de lenguajes favoritos
        lastScrollY: 0, 
        BACKGROUND_COLORS: [
            '#8282d0ff', '#73b9d0ff', '#af6e9fff', '#c8da92ff', '#da9292ff'
        ],
        EQUIPO: [
            { nombre: "Jordan", rol: "Líder del Proyecto y Desarrollador Principal", emoji: "👑" },
            { nombre: "Estefania", rol: "Investigación y Contenido", emoji: "📝" },
            { nombre: "Elizabeth", rol: "Diseño y Estilizado (CSS)", emoji: "🎨" },
            { nombre: "Laura", rol: "Documentación y Pruebas", emoji: "✅" }
        ]
    },

    // 2. MÉTODOS DE INICIALIZACIÓN
    init() {
        // Guardar referencia a elementos principales del DOM
        // Nuevo: Cargar favoritos desde localStorage
        this.state.favorites = JSON.parse(localStorage.getItem('favoriteLanguages')) || [];

        this.state.mainContent = document.getElementById('mainContent');

        this.createBackToTopButton();

        // Nuevo: Crear el interruptor de tema
        this.createThemeSwitcher();

        // Configurar todos los event listeners de la aplicación
        this.bindEvents();

        // Iniciar animaciones de la pantalla de bienvenida
        // this.utils.iniciarCambioDeFondo(); // Desactivado para quitar el fondo cambiante
        this.welcome.crearLogosFlotantes();
        
        // Nuevo: Inicializar el módulo del quiz
        this.quiz.init();
    },

    // 3. MANEJADORES DE EVENTOS
    bindEvents() {
        // Usar 'DOMContentLoaded' para asegurar que el DOM esté listo
        document.addEventListener('DOMContentLoaded', () => {
            // Botón de la pantalla de bienvenida
            document.getElementById('btn-enter-encyclopedia').addEventListener('click', () => this.start(this.render.inicio));
            document.getElementById('btn-enter-about').addEventListener('click', () => this.start(this.render.acercaDe));

            // Input de búsqueda
            document.getElementById('searchInput').addEventListener('keyup', this.handlers.buscarLenguaje.bind(this));

            // Nuevo: Clic en el icono de búsqueda para expandir/contraer
            document.getElementById('search-toggle-btn').addEventListener('click', this.handlers.toggleSearchBar.bind(this));
            document.addEventListener('click', this.handlers.handleDocumentClickForSearch.bind(this));

            // Delegación de eventos para el contenido dinámico
            this.state.mainContent.addEventListener('click', this.handlers.handleMainContentClick.bind(this));

            // Clic en el logo para volver al inicio
            document.querySelector('.logo-link').addEventListener('click', (e) => {
                e.preventDefault();
                this.render.inicio.call(this);
            });

            // Botón "Acerca de" en la barra de navegación
            document.querySelector('.about-button-nav').addEventListener('click', (e) => {
                e.preventDefault();
                this.render.acercaDe.call(this);
            });

            // Nuevo: Botón "Favoritos" en la barra de navegación
            document.querySelector('.favorites-button').addEventListener('click', (e) => {
                e.preventDefault();
                this.render.favoritos.call(this);
            });

            // Manejo del historial del navegador (para enlaces directos y botón de atrás/adelante)
            window.addEventListener('hashchange', this.handlers.handleHashChange.bind(this));

            // Nuevo: Manejo del scroll para ocultar/mostrar la navbar
            window.addEventListener('scroll', this.handlers.handleScroll.bind(this));

            // Nuevo: Evento para el botón de volver arriba
            document.getElementById('back-to-top').addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Nuevo: Evento para el interruptor de tema
            const themeToggle = document.getElementById('theme-toggle');
            themeToggle.addEventListener('change', (e) => {
                this.handlers.handleThemeChange(e.target.checked);
            });

            // Nuevo: Eventos para el Quiz, ahora dentro de App
            document.getElementById('start-game-btn').addEventListener('click', () => {
                this.quiz.startGame();
            });
            document.getElementById('close-quiz-btn').addEventListener('click', () => {
                this.quiz.closeGame();
            });

            // Nuevo: Evento para cerrar el modal de comparación
            document.getElementById('close-comparison-btn').addEventListener('click', () => {
                document.getElementById('comparison-overlay').classList.add('hidden');
            });

            // Nuevo: Evento para el botón "Comparar Ahora"
            document.body.addEventListener('click', (e) => {
                if (e.target.closest('#compare-now-btn')) this.render.comparador.call(this);
            });

            // Nuevo: Event listener global para el efecto Ripple
            document.addEventListener('click', (e) => {
                if (e.target.closest('.ripple-effect')) {
                    this.utils.createRipple(e.target.closest('.ripple-effect'), e);
                }
            });
        });
    },

    // Función que se ejecuta al salir de la pantalla de bienvenida
    start(vistaInicial = this.render.inicio) {
        const overlay = document.getElementById('welcome-overlay');
        const appHeader = document.querySelector('.navbar');
        const appMain = this.state.mainContent;
        const appFooter = document.querySelector('.footer');

        if (overlay && !overlay.classList.contains('hidden')) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.classList.add('hidden'), 500);
        }

        [appHeader, appMain, appFooter].forEach(el => el.classList.remove('hidden'));
        // Nuevo: Comprobar si hay un lenguaje guardado y la intención es ir al inicio
        const lastVisitedId = localStorage.getItem('lastVisitedLanguage');
        const initialHash = window.location.hash.substring(1);

        if (vistaInicial) { // Prioridad 1: Cargar la vista seleccionada en la bienvenida
            vistaInicial.call(this);
        } else if (initialHash) { // Prioridad 2: Cargar el artículo del hash en la URL
            this.render.articulo.call(this, initialHash);
        } else if (lastVisitedId) { // Prioridad 3: Cargar el último artículo visitado
            this.render.articulo.call(this, lastVisitedId);
        } else {
            this.render.inicio.call(this); // Cargar la vista de inicio por defecto
        }

        if (!this.state.colorInterval) {
            // Esto se ejecuta si la app se carga sin la pantalla de bienvenida
            // (por ejemplo, si se elimina el overlay del HTML)
            // this.utils.iniciarCambioDeFondo(); // Desactivado para quitar el fondo cambiante
        }
        document.getElementById('footer-year').textContent = new Date().getFullYear();
    },

    // 4. LÓGICA DE MANEJADORES (HANDLERS)
    handlers: {
        buscarLenguaje(event) {
            const filter = event.target.value.toUpperCase();
            const resultsContainer = document.getElementById('searchResults');
            resultsContainer.innerHTML = '';

            if (filter.length === 0) {
                resultsContainer.style.display = 'none';
                return;
            }

            const resultados = LENGUAJES.filter(lang => lang.nombre.toUpperCase().includes(filter));

            if (resultados.length > 0) {
                resultados.forEach(lang => {
                    const item = document.createElement('a');
                    item.href = `#${lang.id}`;
                    item.className = 'search-result-item';
                    item.textContent = lang.nombre;
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.render.articulo(lang.id);
                        resultsContainer.style.display = 'none';
                    });
                    resultsContainer.appendChild(item);
                });
                resultsContainer.style.display = 'block';
            } else {
                resultsContainer.style.display = 'none';
            }
        },

        toggleSearchBar(event) {
            event.stopPropagation(); // Evita que el clic se propague al documento
            const searchContainer = document.getElementById('search-container');
            const searchInput = document.getElementById('searchInput');
            searchContainer.classList.toggle('active');

            if (searchContainer.classList.contains('active')) {
                searchInput.focus();
            }
        },

        handleDocumentClickForSearch(event) {
            const searchContainer = document.getElementById('search-container');
            const searchResults = document.getElementById('searchResults');
            // Si el clic fue fuera del contenedor de búsqueda y del dropdown, lo cerramos.
            if (!searchContainer.contains(event.target) && !searchResults.contains(event.target)) {
                searchContainer.classList.remove('active');
                searchResults.style.display = 'none';
            }
        },

        handleMainContentClick(event) {
            // Nuevo: Manejar clic en el botón de comparar de una tarjeta (MOVIDO ARRIBA PARA PRIORIDAD)
            const compareBtn = event.target.closest('.compare-btn');
            if (compareBtn) {
                event.stopPropagation(); // Evita que se active el giro de la tarjeta
                this.handlers.toggleCompare.call(this, compareBtn.dataset.langId);
                return; // Importante: detener la ejecución aquí
            }

            // Nuevo: Manejar clic en el botón de favoritos del artículo
            const favoriteBtn = event.target.closest('.favorite-btn');
            if (favoriteBtn) {
                const langId = favoriteBtn.dataset.langId;
                this.handlers.toggleFavorite.call(this, langId);
                return;
            }

            // Nuevo: Manejar clic en el botón de copiar código
            const copyBtn = event.target.closest('.copy-code-btn');
            if (copyBtn) {
                const codeContainer = copyBtn.parentElement;
                const pre = codeContainer.querySelector('pre');
                if (pre) {
                    navigator.clipboard.writeText(pre.textContent).then(() => {                        this.utils.showToast('¡Código copiado al portapapeles!');
                    }).catch(err => {                        this.utils.showToast('Error al copiar el código');
                        console.error('Error al copiar el código: ', err);
                    });
                }
                return;
            }

            // Manejar clics en las tarjetas de lenguaje
            const cardContainer = event.target.closest('.card-container');
            if (cardContainer && cardContainer.dataset.langId) {
                this.render.articulo(cardContainer.dataset.langId);
                return;
            }

            // Manejar clics en el enlace "Volver"
            const backLink = event.target.closest('.back-link');
            if (backLink) {
                event.preventDefault();
                this.render.inicio.call(this);
                return;
            }
        },

        handleScroll() {
            const currentScrollY = window.scrollY;
            const navbar = document.querySelector('.navbar');
            const backToTopBtn = document.getElementById('back-to-top');
            const backgroundContainer = document.getElementById('background-animation-container');

            // No hacer nada si la pantalla de bienvenida está activa
            const overlay = document.getElementById('welcome-overlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                return;
            }

            // Ocultar al bajar, mostrar al subir
            if (currentScrollY > this.state.lastScrollY && currentScrollY > navbar.offsetHeight) {
                navbar.classList.add('navbar--hidden');
            } else {
                navbar.classList.remove('navbar--hidden');
            }

            this.state.lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;

            // Mostrar/ocultar botón de "Volver Arriba"
            if (currentScrollY > window.innerHeight / 2) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }

            // Nuevo: Efecto Parallax para el fondo
            if (backgroundContainer) {
                backgroundContainer.style.transform = `translateY(${currentScrollY * 0.5}px)`;
            }
        },

        handleThemeChange(isDark) {
            if (isDark) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
        },

        handleHashChange() {
            const id = window.location.hash.substring(1);
            if (id) {
                // Si el ID es de un lenguaje, renderiza el artículo.
                // Si no (ej. "section-0", "acerca-de"), no hace nada para permitir el anclaje.
                const isLanguage = LENGUAJES.some(lang => lang.id === id);
                
                if (isLanguage) {
                    this.render.articulo.call(this, id);
                }
            } else {
                this.render.inicio.call(this);
            }
        },

        // Nuevo: Handler para añadir/quitar de favoritos
        toggleFavorite(langId) {
            const favoriteIndex = this.state.favorites.indexOf(langId);
            const favoriteBtn = document.querySelector(`.favorite-btn[data-lang-id="${langId}"]`);

            if (favoriteIndex > -1) { // Ya es favorito, lo quitamos
                this.state.favorites.splice(favoriteIndex, 1);
                if (favoriteBtn) {
                    favoriteBtn.classList.remove('favorited');
                    favoriteBtn.innerHTML = '<span aria-hidden="true">⭐</span> Añadir a Favoritos';
                }
            } else { // No es favorito, lo añadimos
                this.state.favorites.push(langId);
                if (favoriteBtn) {
                    favoriteBtn.classList.add('favorited');
                    favoriteBtn.innerHTML = '<span aria-hidden="true">❤️</span> Quitar de Favoritos';
                    // Nuevo: Añadir clase para la animación y limpiarla después
                    favoriteBtn.classList.add('popping');
                    favoriteBtn.addEventListener('animationend', () => {
                        favoriteBtn.classList.remove('popping');
                    }, { once: true });
                }
            }
            localStorage.setItem('favoriteLanguages', JSON.stringify(this.state.favorites));
        },

        // Nuevo: Handler para añadir/quitar de la lista de comparación
        toggleCompare(langId) {
            const compareIndex = this.state.comparisonList.indexOf(langId);
            const compareBar = document.getElementById('compare-bar');
            const compareLanguagesDiv = document.getElementById('compare-bar-languages');

            if (compareIndex > -1) { // Ya está en la lista, lo quitamos
                this.state.comparisonList.splice(compareIndex, 1);
            } else { // No está, lo añadimos si hay espacio
                if (this.state.comparisonList.length < 3) {
                    this.state.comparisonList.push(langId);
                } else {
                    this.utils.showToast('Puedes comparar un máximo de 3 lenguajes.');
                    return;
                }
            }

            // Actualizar la barra de comparación
            if (this.state.comparisonList.length > 0) {
                compareBar.classList.remove('hidden');
                compareLanguagesDiv.innerHTML = this.state.comparisonList.map(id => {
                    const lang = LENGUAJES.find(l => l.id === id);
                    return `<span class="compare-bar-item">${lang.nombre}</span>`;
                }).join('');
                document.getElementById('compare-now-btn').disabled = this.state.comparisonList.length < 2;
            } else {
                compareBar.classList.add('hidden');
            }
        }
    },

    // 5. LÓGICA DE RENDERIZADO
    render: {
        articulo(id) {
            const lenguaje = LENGUAJES.find(l => l.id === id);
            if (!lenguaje) {
                this.state.mainContent.innerHTML = '<h2>Artículo no encontrado.</h2>';
                return;
            }

            // Nuevo: Limpiar el último lenguaje visitado al volver al inicio
            localStorage.setItem('lastVisitedLanguage', id);

            window.location.hash = id; // Actualizar el hash en la URL

            // --- Generación de TOC y contenido del artículo ---
            const sections = [
                { title: `¿Qué es ${lenguaje.nombre}?`, content: `<p>${lenguaje.queEs}</p>` },
                { title: `¿Cuál es su historia?`, content: `<p>${lenguaje.historia}</p>` },
                { title: `Características Principales`, content: `<p>${lenguaje.caracteristicas}</p>` },
                { title: `¿Qué beneficios ofrece?`, content: `<p>${lenguaje.beneficios}</p>` },
                { title: `¿Cómo se utiliza?`, content: `<p>${lenguaje.comoSeUtiliza}</p>` },
                { title: `¿Dónde se usa?`, content: `<p><strong>Aplicación:</strong> ${lenguaje.uso}</p>` },
                { title: `¿Qué tipo de lenguaje es?`, content: `<p><strong>Tipo:</strong> ${lenguaje.tipo}</p>` },
                { title: `Dato Interesante`, content: `<p>${lenguaje.datosInteresantes}</p>` },
                { title: `Ejemplo Simple de Código`, content: `
                    <div class="code-container">
                        <button class="copy-code-btn">Copiar</button>
                        <pre>${lenguaje.codigo.replace('alert("Hola JavaScript!");', 'console.log("Hola JavaScript!");')}</pre>
                    </div>`
                }
            ];

            let tocHtml = '';
            let articleContentHtml = '';

            sections.forEach((section, index) => {
                const sectionId = `section-${index}`;
                tocHtml += `<li><a href="#${sectionId}" class="toc-link">${section.title}</a></li>`;
                articleContentHtml += `
                    <h3 id="${sectionId}">${section.title}</h3>
                    ${section.content}
                `;
            });

            const tocContainerHtml = `
                <nav class="toc-container"><h3>Índice</h3><ul>${tocHtml}</ul></nav>`;

            const logoSrc = lenguaje.imagen.trim() ? lenguaje.imagen : `https://placehold.co/80x80/${lenguaje.color.substring(1)}/FFFFFF?text=Logo`;
            const codigoEjemplo = lenguaje.codigo.replace('alert("Hola JavaScript!");', 'console.log("Hola JavaScript!");');

            // Nuevo: Lógica para el botón de favoritos
            const isFavorite = this.state.favorites.includes(id);
            const favoriteButtonHtml = `
                <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" data-lang-id="${id}">
                    <span aria-hidden="true">${isFavorite ? '❤️' : '⭐'}</span> ${isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
                </button>
            `;

            const html = `
                <div class="article-layout">
                    <div class="article-view view-fade-in">
                        <div class="article-header">
                            <h1>${lenguaje.nombre}</h1>
                            ${favoriteButtonHtml}
                            <img src="${logoSrc}" alt="Logo de ${lenguaje.nombre}" class="article-logo-large">
                        </div>
                        ${articleContentHtml}
                        <a href="#" class="back-link">
                            ← Volver a la Lista
                        </a>
                    </div>
                    ${tocContainerHtml}
                </div>
            `;
            this.state.mainContent.innerHTML = html;
            document.getElementById('searchResults').style.display = 'none';

            // Nuevo: Activar el resaltado del TOC al hacer scroll
            this.utils.setupTocScrollspy.call(this);
        },

        inicio() {
            // Nuevo: Limpiar el último lenguaje visitado al cargar la página de inicio
            localStorage.removeItem('lastVisitedLanguage');

            window.location.hash = ''; // Limpiar el hash
            let cardsHtml = LENGUAJES.map((lenguaje, index) => {
                const imgSrc = lenguaje.imagen.trim() ? lenguaje.imagen : `https://placehold.co/100x100/${lenguaje.color.substring(1)}/FFFFFF?text=${lenguaje.nombre}`;
                return `
                    <div class="card-container" data-lang-id="${lenguaje.id}" style="animation-delay: ${index * 50}ms;">
                        <div class="card">
                            <div class="card-front" style="--lang-color: ${lenguaje.color};">
                                <img src="${imgSrc}" alt="Logo de ${lenguaje.nombre}" class="lang-logo">
                                <h2>${lenguaje.nombre}</h2>
                            </div>
                            <div class="card-back" style="--lang-color: ${lenguaje.color};">
                                <p>${lenguaje.queEs.substring(0, 120)}...</p>
                            </div>
                        </div>
                        <button class="compare-btn" data-lang-id="${lenguaje.id}">
                            <span aria-hidden="true">⚖️</span> Comparar
                        </button>
                    </div>
                `;
            }).join('');

            const html = `
            <div class="home-view view-fade-in"> 
                <h2>Bienvenido a la Enciclopedia de Lenguajes</h2>
                <p>Explora los lenguajes de programación más utilizados y sus aplicaciones en el mundo del desarrollo de software. También puedes filtrar los lenguajes por nombre.</p>

                <div class="home-grid-container"> 
                    <div class="home-grid">${cardsHtml}</div>
                </div>
            </div> 
            <div id="compare-bar" class="hidden">
                <div id="compare-bar-languages"></div>
                <button id="compare-now-btn" class="nav-button ripple-effect" disabled>Comparar Ahora</button>
            </div>
        `;
            this.state.mainContent.innerHTML = html;
        },

        acercaDe() {
            // Nuevo: Limpiar el último lenguaje visitado también en esta vista
            localStorage.removeItem('lastVisitedLanguage');

            window.location.hash = 'acerca-de'; // Opcional: para mantener consistencia

            const html = `
            <div class="about-view article-view view-fade-in">
                <h1 style="text-align: center;">Acerca de la Enciclopedia Digital</h1>
                <p style="text-align: center; margin-bottom: 40px; font-size: 1.1em;">
                    Este proyecto es una enciclopedia interactiva de lenguajes de programación, creada como un proyecto para la clase de Programación de 5to Semestre.
                </p>
                
                <h3>Objetivo del Proyecto</h3>
                <p>
                    El objetivo principal es ofrecer una herramienta educativa y fácil de usar para explorar y aprender sobre los fundamentos de diversos lenguajes de programación. La aplicación está diseñada para ser visualmente atractiva e interactiva, facilitando la consulta de información clave de cada lenguaje.
                </p>

                <h3>Características Principales</h3>
                <ul>
                    <li><strong>Exploración de Lenguajes:</strong> Navega a través de tarjetas interactivas para descubrir información detallada de cada lenguaje.</li>
                    <li><strong>Búsqueda y Filtro:</strong> Encuentra rápidamente el lenguaje que te interesa usando la barra de búsqueda.</li>
                    <li><strong>Herramienta de Comparación:</strong> Selecciona hasta 3 lenguajes y compáralos lado a lado en una tabla detallada.</li>
                    <li><strong>Quiz Interactivo:</strong> Pon a prueba tus conocimientos con un divertido juego de preguntas y respuestas.</li>
                    <li><strong>Favoritos:</strong> Guarda tus lenguajes preferidos para un acceso rápido.</li>
                </ul>

                <a href="#" class="back-link" style="text-align: center; display: block; margin-top: 40px;">
                    ← Volver a la Lista Principal
                </a>
            </div>
        `;
            this.state.mainContent.innerHTML = html;
        },

        // Nuevo: Vista para mostrar los lenguajes favoritos
        favoritos() {
            localStorage.removeItem('lastVisitedLanguage');
            window.location.hash = 'favoritos';

            const favoriteLanguages = LENGUAJES.filter(lang => this.state.favorites.includes(lang.id));

            let cardsHtml = '';
            if (favoriteLanguages.length > 0) {
                cardsHtml = favoriteLanguages.map(lenguaje => {
                    const imgSrc = lenguaje.imagen.trim() ? lenguaje.imagen : `https://placehold.co/100x100/${lenguaje.color.substring(1)}/FFFFFF?text=${lenguaje.nombre}`;
                    return `
                        <div class="card-container" data-lang-id="${lenguaje.id}">
                            <div class="card">
                                <div class="card-front" style="--lang-color: ${lenguaje.color};">
                                    <img src="${imgSrc}" alt="Logo de ${lenguaje.nombre}" class="lang-logo">
                                    <h2>${lenguaje.nombre}</h2>
                                </div>
                                <div class="card-back" style="--lang-color: ${lenguaje.color};">
                                    <p>${lenguaje.queEs.substring(0, 120)}...</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            const html = `
                <div class="home-view view-fade-in"> 
                    <h2>Tus Lenguajes Favoritos</h2>
                    ${favoriteLanguages.length > 0 ? `<div class="home-grid-container"><div class="home-grid">${cardsHtml}</div></div>` : '<p>Aún no has añadido ningún lenguaje a tus favoritos. ¡Explora la enciclopedia y marca tus preferidos con una ⭐!</p>'}
                </div>`;
            this.state.mainContent.innerHTML = html;
        },

        

        // Nuevo: Vista para el comparador
        comparador() {
            const languagesToCompare = LENGUAJES.filter(lang => this.state.comparisonList.includes(lang.id));
            
            const properties = [
                { key: 'nombre', label: 'Nombre' },
                { key: 'year', label: 'Año de Creación' },
                { key: 'author', label: 'Autor' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'uso', label: 'Uso Principal' }
            ];

            let tableHeader = '<th>Característica</th>';
            languagesToCompare.forEach(lang => {
                tableHeader += `<th>${lang.nombre}</th>`;
            });

            let tableBody = '';
            properties.forEach(prop => {
                tableBody += `<tr><td><strong>${prop.label}</strong></td>`;
                languagesToCompare.forEach(lang => {
                    tableBody += `<td>${lang[prop.key]}</td>`;
                });
                tableBody += '</tr>';
            });

            const html = `
                <h1>Tabla Comparativa</h1>
                <div class="table-container">
                    <table class="compare-table">
                        <thead>
                            <tr>${tableHeader}</tr>
                        </thead>
                        <tbody>
                            ${tableBody}
                        </tbody>
                    </table>
                </div>`;
            
            document.getElementById('comparison-content').innerHTML = html;
            document.getElementById('comparison-overlay').classList.remove('hidden');
        }
    },

    // Nuevo: Método para crear el botón de "Volver Arriba"
    createBackToTopButton() {
        const btn = document.createElement('button');
        btn.id = 'back-to-top';
        btn.className = 'back-to-top-btn ripple-effect';
        btn.setAttribute('aria-label', 'Volver arriba');
        btn.innerHTML = '<span aria-hidden="true">↑</span>';
        document.body.appendChild(btn);
    },

    // Nuevo: Método para crear el interruptor de tema
    createThemeSwitcher() {
        const navActions = document.querySelector('.nav-actions');
        if (!navActions) return;

        const switcherHtml = `
            <div class="theme-switcher">
                <span class="theme-switcher-label" aria-hidden="true">🌙</span>
                <label class="switch">
                    <input type="checkbox" id="theme-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        `;
        navActions.insertAdjacentHTML('beforeend', switcherHtml);

        // Aplicar tema guardado al cargar
        const savedTheme = localStorage.getItem('theme');
        const themeToggle = document.getElementById('theme-toggle');
        const welcomeOverlay = document.getElementById('welcome-overlay');

        if (savedTheme === 'dark') {
            themeToggle.checked = true;
            document.body.classList.add('dark-theme');
        }
    },

    // 6. LÓGICA DE LA PANTALLA DE BIENVENIDA
    welcome: {
        // Esta función ahora crea los logos en el contenedor de fondo
        crearLogosFlotantes() {
            // Creamos el contenedor de la animación y lo añadimos al body
            let container = document.getElementById('background-animation-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'background-animation-container';
                document.body.prepend(container); // Lo añadimos al principio del body
            }

            if (!container) return;

            LENGUAJES.forEach(lang => { // Usamos la variable global LENGUAJES
                if (!lang.imagen || lang.imagen.trim() === "") return;

                const img = document.createElement('img');
                img.src = lang.imagen;
                img.className = 'floating-logo';
                container.appendChild(img);

                const size = Math.random() * 60 + 40;
                // Establecemos el tamaño una sola vez para mejorar el rendimiento
                img.style.width = `${size}px`;
                img.style.height = `${size}px`;

                App.state.logosAnimados.push({
                    el: img,
                    x: Math.random() * (window.innerWidth - size),
                    y: Math.random() * (window.innerHeight - size),
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    size: size
                });
            });
            this.animarLogos();
        },

        animarLogos() {
            App.state.logosAnimados.forEach(logo => {
                logo.x += logo.vx;
                logo.y += logo.vy;

                if (logo.x <= 0 || logo.x + logo.size >= window.innerWidth) logo.vx *= -1;
                if (logo.y <= 0 || logo.y + logo.size >= window.innerHeight) logo.vy *= -1;

                // Usamos transform para una animación más fluida (acelerada por GPU)
                logo.el.style.transform = `translate(${logo.x}px, ${logo.y}px)`;
            });
            requestAnimationFrame(this.animarLogos.bind(this));
        }
    },

    // 7. FUNCIONES DE UTILIDAD
    utils: {
        obtenerColorAleatorio() {
            const colors = App.state.BACKGROUND_COLORS;
            return colors[Math.floor(Math.random() * colors.length)];
        },

        iniciarCambioDeFondo() {
            if (App.state.colorInterval) return;

            App.state.colorInterval = setInterval(() => {
                const newColor = this.obtenerColorAleatorio();
                const welcomeOverlay = document.getElementById('welcome-overlay');
                
                if (welcomeOverlay && !welcomeOverlay.classList.contains('hidden')) {
                    welcomeOverlay.style.backgroundColor = newColor;
                } else {
                    document.body.style.backgroundColor = newColor;
                }
            }, 3000);
        },

        // Nuevo: Lógica para resaltar el TOC activo al hacer scroll
        setupTocScrollspy() {
            const tocLinks = document.querySelectorAll('.toc-link');
            const sections = document.querySelectorAll('.article-view h3[id]');
            if (tocLinks.length === 0 || sections.length === 0) return;

            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const id = entry.target.getAttribute('id');
                    const tocLink = document.querySelector(`.toc-link[href="#${id}"]`);

                    if (entry.isIntersecting) {
                        tocLinks.forEach(link => link.classList.remove('active'));
                        if (tocLink) {
                            tocLink.classList.add('active');
                        }
                    }
                });
            }, {
                rootMargin: '-30% 0px -70% 0px' // Activa el elemento cuando está en el 30% superior de la pantalla
            });

            sections.forEach(section => observer.observe(section));
        },

        // Nuevo: Función para mostrar notificaciones "toast"
        showToast(message, duration = 3000) {
            // Crear el elemento toast
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.textContent = message;

            document.body.appendChild(toast);

            // Añadir la clase 'show' para activar la animación de entrada
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);

            // Ocultar y eliminar el toast después de la duración especificada
            setTimeout(() => {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => {
                    toast.remove();
                });
            }, duration);
        },

        // Nuevo: Función para crear el efecto de onda (ripple)
        createRipple(element, event) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';

            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            element.appendChild(ripple);

            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        }
    },

    // 8. LÓGICA DEL JUEGO (QUIZ)
    quiz: {
        // Estado del Quiz
        shuffledQuestions: [],
        currentQuestionIndex: 0,
        score: 0,
        scoreDisplay: null,

        // Elementos del DOM
        quizOverlay: null,
        quizContainer: null,
        questionElement: null,
        answerButtonsElement: null,

        init() {
            this.quizOverlay = document.getElementById('quiz-overlay');
            this.quizContainer = document.getElementById('quiz-container');
            this.questionElement = document.getElementById('question');
            this.answerButtonsElement = document.getElementById('answer-buttons');
        },

        startGame() {
            this.score = 0;
            this.quizOverlay.classList.remove('hidden');
            this.updateScoreDisplay();

            const questions = this.generateQuestions();
            this.shuffledQuestions = questions.sort(() => Math.random() - 0.5);
            this.currentQuestionIndex = 0;
            this.setNextQuestion();
        },

        closeGame() {
            this.quizOverlay.classList.add('hidden');
            this.clearEndGameAnimations();
        },

        setNextQuestion() {
            this.clearEndGameAnimations();
            this.resetState();
            if (this.currentQuestionIndex < this.shuffledQuestions.length) {
                this.updateScoreDisplay();
                this.showQuestion(this.shuffledQuestions[this.currentQuestionIndex]);
            } else {
                this.questionElement.innerText = `🎉 ¡Juego terminado! Puntuación final: ${this.score} de ${this.shuffledQuestions.length}`;
                this.answerButtonsElement.innerHTML = '<button id="restart-game-btn" class="nav-button">Jugar de Nuevo</button>';

                if (this.score > this.shuffledQuestions.length / 2) {
                    this.triggerWinAnimation();
                } else {
                    this.triggerLoseAnimation();
                }

                document.getElementById('restart-game-btn').addEventListener('click', this.startGame.bind(this));
            }
        },

        showQuestion(question) {
            this.questionElement.innerText = question.question;
            question.answers.forEach(answer => {
                const button = document.createElement('button');
                button.innerText = answer.text;
                button.classList.add('btn', 'ripple-effect');
                if (answer.correct) {
                    button.dataset.correct = answer.correct;
                }
                button.addEventListener('click', this.selectAnswer.bind(this));
                this.answerButtonsElement.appendChild(button);
            });
        },

        resetState() {
            while (this.answerButtonsElement.firstChild) {
                this.answerButtonsElement.removeChild(this.answerButtonsElement.firstChild);
            }
        },

        selectAnswer(e) {
            const selectedButton = e.target;
            const correct = selectedButton.dataset.correct === 'true';

            if (correct) {
                this.score++;
            }

            this.updateScoreDisplay();

            Array.from(this.answerButtonsElement.children).forEach(button => {
                this.setStatusClass(button, button.dataset.correct === 'true');
            });

            setTimeout(() => {
                this.currentQuestionIndex++;
                this.setNextQuestion();
            }, 1500);
        },

        setStatusClass(element, correct) {
            if (correct) {
                element.classList.add('correct');
            } else {
                element.classList.add('wrong');
            }
        },

        updateScoreDisplay() {
            if (!this.scoreDisplay) {
                this.scoreDisplay = document.createElement('div');
                this.scoreDisplay.id = 'quiz-score-display';
                this.scoreDisplay.style.fontSize = '1.2em';
                this.scoreDisplay.style.fontWeight = 'bold';
                this.scoreDisplay.style.marginBottom = '15px';
                this.quizContainer.prepend(this.scoreDisplay);
            }
            this.scoreDisplay.innerText = `Puntuación: ${this.score}`;
        },

        triggerWinAnimation() {
            const container = document.getElementById('end-game-animation-container');
            const fragment = document.createDocumentFragment();
            const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.classList.add('confetti');
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = `${Math.random() * 2}s`;
                confetti.style.animationDuration = `${Math.random() * 1.5 + 2}s`;
                fragment.appendChild(confetti);
            }
            container.appendChild(fragment);
        },

        triggerLoseAnimation() {
            const container = document.getElementById('end-game-animation-container');
            for (let i = 0; i < 30; i++) {
                const sadFace = document.createElement('div');
                sadFace.classList.add('sad-face');
                sadFace.innerHTML = '<span aria-hidden="true">😢</span>';
                sadFace.style.left = `${Math.random() * 100}%`;
                sadFace.style.animationDelay = `${Math.random() * 5}s`;
                sadFace.style.animationDuration = `${Math.random() * 3 + 4}s`;
                container.appendChild(sadFace);
            }
        },

        clearEndGameAnimations() {
            const container = document.getElementById('end-game-animation-container');
            if (container) {
                container.innerHTML = '';
            }
        },

        generateQuestions() {
            const allQuestions = [];
            const languagesWithData = LENGUAJES.filter(lang => lang.tipo && lang.uso && lang.caracteristicas);

            languagesWithData.forEach(lang => {
                allQuestions.push({
                    question: `¿Qué lenguaje es principalmente de tipo "${lang.tipo}"?`,
                    answers: this.generateAnswers(languagesWithData, lang, 'nombre')
                });
                const usos = lang.uso.split(',').map(u => u.trim());
                const usoAleatorio = usos[Math.floor(Math.random() * usos.length)];
                allQuestions.push({
                    question: `¿Cuál de estos lenguajes es popular para "${usoAleatorio}"?`,
                    answers: this.generateAnswers(languagesWithData, lang, 'nombre')
                });
                const caracteristicas = lang.caracteristicas.split(',').map(c => c.trim());
                const caracteristicaAleatoria = caracteristicas[Math.floor(Math.random() * caracteristicas.length)];
                allQuestions.push({
                    question: `¿Qué lenguaje se describe con la característica: "${caracteristicaAleatoria}"?`,
                    answers: this.generateAnswers(languagesWithData, lang, 'nombre')
                });
            });

            return allQuestions.sort(() => Math.random() - 0.5).slice(0, 8);
        },

        generateAnswers(allLanguages, correctLanguage, property) {
            const correctAnswer = { text: correctLanguage[property], correct: true };
            const wrongAnswers = [];
            if (!correctAnswer.text) return [];

            const otherLanguages = allLanguages.filter(l => l.id !== correctLanguage.id);
            while (wrongAnswers.length < 3 && otherLanguages.length > 0) {
                const randomIndex = Math.floor(Math.random() * otherLanguages.length);
                const randomLang = otherLanguages.splice(randomIndex, 1)[0]; // Evita seleccionar el mismo lenguaje dos veces
                const randomAnswerText = randomLang[property];
                if (randomAnswerText && randomAnswerText !== correctAnswer.text && !wrongAnswers.some(a => a.text === randomAnswerText)) {
                    wrongAnswers.push({ text: randomAnswerText, correct: false });
                }
            }

            const allAnswers = [correctAnswer, ...wrongAnswers];
            return allAnswers.sort(() => Math.random() - 0.5);
        }
    }
};

// Iniciar la aplicación
App.init();