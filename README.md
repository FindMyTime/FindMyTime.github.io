# clock | World Clock App

A premium, interactive world clock application built with HTML, CSS, and Vanilla JavaScript.

## Features
- **Analog & Digital Clocks**: Each timezone has both a classic analog face and a modern digital display.
- **Time Comparison Slider**: Travel through time with the global slider to see what time it will be in all your added zones at any moment (up to +/- 12 hours).
- **Favorites (Pin to Top)**: Pin your most important timezones to the favorites section for quick access.
- **Timezone Search**: Quickly find and add any IANA timezone using the real-time search bar.
- **Local Time Comparison**: Automatically calculates the time difference between each zone and your local time.
- **Dark/Light Mode**: Premium glassmorphism UI with a theme toggle.
- **Persistence**: Your selected clocks and favorites are saved to your browser's local storage.

## Local Development (Docker)
To run this project locally on port 8084:
```bash
docker-compose up -d
```
Then visit `http://localhost:8084` in your browser.

## Deployment
This project is design-ready for **GitHub Pages**. Just push the repository to GitHub and enable GitHub Pages in the settings.

## Tech Stack
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Libraries**: 
  - [Luxon](https://moment.github.io/luxon/) for timezone and date logic.
  - [Lucide](https://lucide.dev/) for icons.
  - Google Fonts (Inter, JetBrains Mono).
- **Docker**: Nginx Alpine for serving static files.
