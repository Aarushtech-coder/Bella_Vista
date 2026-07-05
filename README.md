# 🍷 Bella Vista — Authentic Italian Restaurant Website

A modern, fully responsive multi-page website for **Bella Vista**, an authentic Italian restaurant in New York City. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step, just open and go.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## 📖 Overview

Bella Vista is a restaurant marketing and booking website that lets visitors explore the menu, learn the restaurant's story, browse a photo gallery, chat with a virtual assistant, and reserve a table online.

## ✨ Features

- **Home Page** — Hero section, stats, featured dishes, signature specials, testimonials, and calls to action
- **About Page** — Restaurant story, core values, team profiles, and awards/recognition
- **Menu Page** — Filterable menu by category (Appetizers, Pasta, Pizza, Main Courses, Desserts, Drinks)
- **Gallery Page** — Filterable image gallery (Food, Ambience, Kitchen, Events) with a lightbox viewer (prev/next, keyboard navigation)
- **Reservation Page** — Full booking form with client-side validation (name, email, phone, date, time, party size, occasion, special requests) and a success confirmation state
- **"Ask Bella" Chatbot Page** — Interactive assistant UI for answering questions about the menu, hours, and reservations
- **Responsive Navigation** — Sticky header with scroll effects and a mobile hamburger menu
- **Scroll Animations** — Sections fade/slide into view using `IntersectionObserver`
- **Scroll-to-Top Button**

## 🗂️ Project Structure

```
bella-vista/
├── index.html          # Home page
├── about.html           # About Us page
├── menu.html             # Menu page with category filtering
├── gallery.html          # Photo gallery with lightbox
├── reservation.html      # Table reservation form
├── chatbot.html          # "Ask Bella" chatbot interface
├── style.css             # Global styles (shared across all pages)
├── chatbot.css           # Chatbot-specific styles
├── script.js             # Shared JS: nav, scroll effects, menu/gallery filters, form validation
├── img/                  # Local image assets (hero, chef, gallery, food photos)
└── README.md
```

## 🛠️ Tech Stack

- **HTML5** — Semantic markup across 6 pages
- **CSS3** — Custom properties, Flexbox/Grid layouts, responsive design, animations
- **Vanilla JavaScript (ES6)** — No dependencies or frameworks
- **Google Fonts** — Playfair Display & Inter

## 🚀 Getting Started

### Prerequisites
Just a modern web browser. No Node.js, npm, or build tools required.

### Run Locally

**Option 1 — Open directly**
```bash
git clone https://github.com/<your-username>/bella-vista.git
cd bella-vista
open index.html   # macOS
# or double-click index.html in File Explorer/Finder
```

**Option 2 — Local server (recommended, avoids relative-path issues)**
```bash
# Using Python
python3 -m http.server 8000

# Using Node (npx)
npx serve .
```
Then visit `http://localhost:8000` in your browser.

## 📁 Adding Images

The site references local images from an `img/` folder (`hero.png`, `chef.png`, `gallery-dining.png`, `food-spread.png`, etc.), plus some hosted on Unsplash. Add your own restaurant photos to the `img/` folder using the same filenames referenced in the HTML files, or update the `src` paths accordingly.

## 📌 Notes

- This is a **static front-end site** — the reservation form currently simulates submission on the client side (no backend/database is connected yet). To make it functional, hook `script.js`'s `setupReservationForm()` up to a backend API, form service (e.g., Formspree, EmailJS), or serverless function.
- The chatbot page (`chatbot.html`) provides the UI shell; connect it to a real chat/AI backend to make it interactive.

## 📄 License

This project is open source. Feel free to use it as a template for your own restaurant or business website.

## 🙋 Author

Built by **Bella Vista Dev Team** — questions or contributions welcome via Issues/PRs.
