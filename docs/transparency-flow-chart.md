# Window Transparency Implementation Flow Chart

```mermaid
flowchart TD
    A[App Startup] --> B[electron/main.ts]
    B --> C{Platform Check}
    C -->|macOS| D[Enable Native Vibrancy]
    C -->|Windows/Linux| E[CSS-Only Transparency]
    
    D --> F[Get Current Theme]
    F --> G[getVibrancyMaterialForConstructor]
    G --> H[BrowserWindow Creation]
    H --> I[transparent: true + vibrancy material]
    
    E --> H
    H --> J[Load React App]
    
    J --> K[src/shared/providers/ThemeProvider.tsx]
    K --> L[Apply Theme Class to DOM]
    L --> M[Set CSS Custom Properties]
    M --> N[--transparency-backdrop-blur<br/>--transparency-overlay-color<br/>--transparency-overlay-opacity]
    
    N --> O[src/main-window/components/NoteList.tsx]
    O --> P[Apply notes-container-transparent class]
    
    P --> Q[src/shared/styles/common.css]
    Q --> R[.notes-container-transparent styles]
    
    R --> S[::before pseudo-element]
    S --> T[Backdrop overlay with blur]
    
    R --> U[::after pseudo-element]
    U --> V[Gradient enhancement]
    
    T --> W[Theme-specific styling]
    V --> W
    
    W --> X{Current Theme}
    X -->|Light| Y[rgba(248,250,252,0.95)<br/>blur(10px)]
    X -->|Dark| Z[Gradient overlay<br/>blur(20px) + saturation]
    X -->|Dim| AA[Complex gradient<br/>blur(20px) + color filters]
    
    Y --> BB[Final Visual Effect]
    Z --> BB
    AA --> BB
    
    %% Theme Change Flow
    CC[Theme Change Event] --> DD[electron/main.ts]
    DD --> EE[theme-changed IPC]
    EE --> FF{macOS?}
    FF -->|Yes| GG[Update setVibrancy for all windows]
    FF -->|No| HH[CSS handles transparency]
    
    GG --> II[getVibrancyMaterialForSetMethod]
    II --> JJ[Apply new vibrancy material]
    
    %% Additional CSS Files
    KK[src/index.css] --> LL[Root transparency overrides<br/>Light theme: transparent background]
    LL --> MM[Body transparency for light theme]
    
    NN[src/App.css] --> OO[App container transparency<br/>Light theme overrides]
    
    %% File Dependencies
    PP[Key Files Involved:] --> QQ[electron/main.ts<br/>- Window creation<br/>- Vibrancy control<br/>- IPC handlers]
    PP --> RR[src/shared/providers/ThemeProvider.tsx<br/>- Theme management<br/>- CSS variables]
    PP --> SS[src/main-window/components/NoteList.tsx<br/>- Container with transparency class]
    PP --> TT[src/shared/styles/common.css<br/>- Main transparency styles<br/>- Theme-specific effects]
    PP --> UU[src/index.css<br/>- Root transparency overrides]
    PP --> VV[src/App.css<br/>- App-level transparency]
    PP --> WW[electron/preload.ts<br/>- IPC bridge for transparency]
    
    style A fill:#e1f5fe
    style BB fill:#c8e6c9
    style Q fill:#fff3e0
    style K fill:#f3e5f5
    style B fill:#ffebee
```

## File Responsibilities

### Core Implementation Files:

1. **electron/main.ts**
   - Creates BrowserWindow with `transparent: true`
   - Handles macOS vibrancy materials based on theme
   - Manages theme change IPC events
   - Platform-specific transparency configuration

2. **src/shared/styles/common.css**
   - Main transparency implementation
   - `.notes-container-transparent` class with pseudo-elements
   - Theme-specific backdrop filters and overlays
   - Cross-platform compatibility styles

3. **src/shared/providers/ThemeProvider.tsx**
   - Sets CSS custom properties for transparency
   - Manages theme state and DOM class application
   - Bridges theme changes to transparency system

4. **src/main-window/components/NoteList.tsx**
   - Applies the `notes-container-transparent` class
   - Container that receives the transparency effects

### Supporting Files:

5. **src/index.css**
   - Root-level transparency overrides for light theme
   - Ensures proper background transparency inheritance

6. **src/App.css**
   - App container transparency settings
   - Theme-specific app background overrides

7. **electron/preload.ts**
   - IPC bridge for transparency controls
   - Exposes transparency methods to renderer process

## Data Flow Summary:

1. **Initialization**: Electron creates transparent window with optional vibrancy
2. **Theme Application**: ThemeProvider sets CSS variables and DOM classes
3. **Visual Rendering**: CSS applies backdrop filters and overlays via pseudo-elements
4. **Theme Changes**: IPC events update both native vibrancy and CSS variables
5. **Final Effect**: Layered transparency with theme-specific visual enhancements