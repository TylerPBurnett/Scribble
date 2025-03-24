# Sticky Notes

A lightweight desktop application for creating and managing Markdown-based sticky notes. Built with Electron.

## Features

- Create and manage sticky notes on your desktop
- Markdown support for text formatting
- Search functionality with fuzzy search
- Customizable note colors
- Pin notes to stay on top of other windows
- Automatic saving

## Screenshots

![Sticky Notes Main Window](./screenshots/main-window.png)

## Installation

1. Clone this repository
```bash
git clone https://github.com/yourusername/sticky-notes.git
cd sticky-notes
```

2. Install dependencies
```bash
npm install
```

3. Start the application
```bash
npm start
```

## Usage

### Creating Notes
Click the "New Note" button to create a new sticky note.

### Editing Notes
Simply start typing in a note to edit it. All changes are saved automatically.

### Searching Notes
Use the search bar to find notes by content. The search supports fuzzy matching.

### Customizing Notes
Click the color buttons at the top of each note to change its background color.

### Window Controls
- Pin button: Keep the note on top of other windows
- Minimize button: Minimize the note
- Close button: Close the note

## Development

### Project Structure
- `src/`: Source code
  - `index.js`: Main process
  - `index.html`: Main window
  - `note.html`: Note window
  - `renderer.js`: Main window renderer
  - `note.js`: Note window renderer
  - `preload.js`: Preload script
  - `styles/`: CSS files
  - `scripts/`: Additional JavaScript files

### Building

```bash
npm run make
```

## License

[MIT](LICENSE)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 