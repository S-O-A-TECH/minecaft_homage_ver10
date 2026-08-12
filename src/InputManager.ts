export type GameMode = 'game' | 'cursor' | 'ui';

export class InputManager {
    public keys: Set<string> = new Set();
    public mouseDown: Set<number> = new Set();
    public mouseMoved: boolean = false;
    public mouseDX: number = 0;
    public mouseDY: number = 0;
    public isPointerLocked: boolean = false;
    public gameMode: GameMode = 'game';

    // Cursor mode: screen-space mouse position (normalized 0-1)
    public cursorX: number = 0.5;
    public cursorY: number = 0.5;

    // Scroll wheel zoom
    public scrollDelta: number = 0;

    private onKeyDown: (e: KeyboardEvent) => void;
    private onKeyUp: (e: KeyboardEvent) => void;
    private onMouseDown: (e: MouseEvent) => void;
    private onMouseUp: (e: MouseEvent) => void;
    private onMouseMove: (e: MouseEvent) => void;
    private onWheel: (e: WheelEvent) => void;
    private onPointerLockChange: () => void;
    private onContextMenu: (e: Event) => void;

    constructor() {
        this.onKeyDown = (e: KeyboardEvent) => {
            this.keys.add(e.code);
        };

        this.onKeyUp = (e: KeyboardEvent) => {
            this.keys.delete(e.code);
        };

        this.onMouseDown = (e: MouseEvent) => {
            this.mouseDown.add(e.button);
        };

        this.onMouseUp = (e: MouseEvent) => {
            this.mouseDown.delete(e.button);
        };

        this.onMouseMove = (e: MouseEvent) => {
            if (this.gameMode === 'game' && this.isPointerLocked) {
                // Game mode: accumulate movement for camera rotation
                this.mouseDX += e.movementX;
                this.mouseDY += e.movementY;
                this.mouseMoved = true;
            } else if (this.gameMode === 'cursor') {
                // Cursor mode: track screen position for raycasting
                this.cursorX = e.clientX / window.innerWidth;
                this.cursorY = e.clientY / window.innerHeight;
                this.mouseMoved = true;
            }
            // UI mode: ignore mouse movement for camera
        };

        this.onPointerLockChange = () => {
            const wasLocked = this.isPointerLocked;
            this.isPointerLocked = document.pointerLockElement !== null;

            if (!this.isPointerLocked && wasLocked) {
                // Pointer lock was released externally (e.g., Esc key)
                if (this.gameMode === 'game') {
                    this.gameMode = 'cursor';
                }
            }
        };

        this.onContextMenu = (e: Event) => {
            e.preventDefault();
        };

        this.onWheel = (e: WheelEvent) => {
            this.scrollDelta += e.deltaY;
        };

        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
        document.addEventListener('wheel', this.onWheel);
        document.addEventListener('contextmenu', this.onContextMenu);
    }

    isKeyDown(code: string): boolean {
        return this.keys.has(code);
    }

    isMouseButtonDown(button: number): boolean {
        return this.mouseDown.has(button);
    }

    consumeMouseMovement(): { dx: number; dy: number } {
        const dx = this.mouseDX;
        const dy = this.mouseDY;
        this.mouseDX = 0;
        this.mouseDY = 0;
        this.mouseMoved = false;
        return { dx, dy };
    }

    consumeScrollDelta(): number {
        const delta = this.scrollDelta;
        this.scrollDelta = 0;
        return delta;
    }

    requestPointerLock(): void {
        document.body.requestPointerLock();
    }

    exitPointerLock(): void {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    setGameMode(mode: GameMode): void {
        this.gameMode = mode;

        // Clear any mouse down states on mode transition to prevent stuck states or accidental actions
        this.mouseDown.clear();

        if (mode === 'game') {
            // Request pointer lock for game mode
            if (!this.isPointerLocked) {
                this.requestPointerLock();
            }
        } else {
            // Release pointer lock for cursor/UI modes
            if (this.isPointerLocked) {
                this.exitPointerLock();
            }
        }
    }

    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('wheel', this.onWheel);
        document.removeEventListener('contextmenu', this.onContextMenu);
    }
}