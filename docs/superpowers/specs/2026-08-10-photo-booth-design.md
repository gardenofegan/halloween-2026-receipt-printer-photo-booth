# Halloween 2026 Receipt Printer Photo Booth - Design Spec

## Overview
A web-based photo booth application designed for a Wild West-themed Halloween party. The app runs on a Windows Surface Pro 9 and utilizes a Logitech C920S webcam to take photos. The photos are processed in the browser to apply a Wild West frame and a black-and-white dithering effect, then sent to a local Node.js server which prints the final image on an Epson TM-T88III thermal receipt printer. The interface is optimized for "Kiosk Mode" to be completely foolproof for kids and teenagers.

## System Architecture
* **Frontend:** Vanilla JS, HTML, and CSS. Runs full-screen in a browser (Edge/Chrome).
* **Backend:** A lightweight Node.js Express server running locally on the same Surface Pro.
* **Hardware:**
  * Windows Surface Pro 9
  * Logitech C920S HD Webcam
  * Epson TM-T88III Receipt Printer (M129C)
  * USB LED lighting for evening illumination

## User Experience Flow
1. **Idle/Live View:** The screen displays a live, mirrored camera feed. The currently selected Wild West frame (e.g., "Wanted", "Sheriff") overlays the live feed. A large, obvious "Take Photo" button is on the screen.
2. **Frame Selection:** The user can swipe or tap left/right arrows to cycle through the available frame overlays.
3. **Capture & Countdown:** The user taps "Take Photo". A 3-second countdown overlay appears on the screen (3... 2... 1...).
4. **Preview:** The photo is captured. The browser applies the selected frame and processes the image using a Floyd-Steinberg dithering algorithm (or similar) via the HTML5 Canvas API to create a high-contrast black-and-white image. This exact processed image is shown as a preview for 4 seconds.
5. **Print & Cooldown:** The processed base64 image is sent to the Node.js server to be printed. The UI displays a "Printing..." screen with a progress bar representing a 10-15 second cooldown. This prevents users from spamming the printer.
6. **Reset:** The system returns to the Idle state.

## Software Components

### Frontend (Browser)
* **`index.html`**: The main layout. Includes the video element for the live feed, a canvas element for processing, and UI overlays (buttons, countdown, cooldown progress).
* **`styles.css`**: Touch-optimized CSS. Large tap targets, no scrolling, disables text selection/zoom to mimic a native app.
* **`camera.js`**: Handles `navigator.mediaDevices.getUserMedia()` to initialize and manage the webcam stream.
* **`processor.js`**: Core image processing logic. Takes the raw camera frame, overlays the selected PNG frame, converts it to grayscale, applies dithering to make it 1-bit black-and-white, and outputs a base64 string.
* **`app.js`**: The state machine. Manages transitions between Idle, Countdown, Preview, and Cooldown states. Handles UI events and makes POST requests to the backend `/print` endpoint.

### Backend (Node.js)
* **`server.js`**: Express application. Serves the static frontend files and listens for POST requests on `/print`.
* **`printer.js`**: Handles communication with the Epson TM-T88III. Uses a library (such as `escpos`) to connect via USB/Serial, decode the incoming base64 image, and send ESC/POS raster print commands and a paper cut command.

## Data Flow
1. User clicks "Take Photo".
2. `app.js` captures a frame from the `<video>` element into a hidden `<canvas>`.
3. `processor.js` applies the frame overlay and dithering on the `<canvas>`.
4. `app.js` calls `canvas.toDataURL()` and shows this to the user.
5. `app.js` sends the data URL via `fetch()` (POST) to `http://localhost:3000/print`.
6. `server.js` receives the data URL, extracts the base64 image data, and passes it to `printer.js`.
7. `printer.js` converts the image data into ESC/POS bytes and writes them to the printer buffer.

## GitHub Issues Strategy (Implementation Plan)
The implementation will be tracked in the GitHub repository (`gardenofegan/halloween-2026-receipt-printer-photo-booth`) across the following phases/issues:
1. **Project Setup & Scaffolding:** Initialize Node.js, Express, static serving, and basic HTML structure.
2. **Webcam Integration:** Request camera permissions and render the C920S live feed in the browser.
3. **UI & State Machine:** Build the UI components (buttons, countdown) and wire up the state transitions (Idle -> Capture -> Cooldown).
4. **Image Processing:** Implement the Canvas logic for Wild West frames and 1-bit dithering.
5. **Printer Integration:** Implement the backend `/print` endpoint, integrate the `escpos` library, and successfully print a test photo.
6. **Final Polish & Kiosk Mode:** Fine-tune the cooldown timer, handle printer errors gracefully in the UI, and document the Windows Kiosk mode setup instructions.
