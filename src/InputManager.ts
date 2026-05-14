export class InputManager {
    public keys: Set<string> = new Set();
    public mouseDown: Set<number> = new Set();
    public mouseMoved: boolean = false;
    public mouseDX: number = 0;
    public mouseDY: number = 0;
    public isPointerLocked: boolean = true;

    private onKeyDown: (e: KeyboardEvent) => void;
    private onKeyUp: (e: KeyboardEvent) => void;
    private onMouseDown: (e: MouseEvent) => void;
    private onMouseUp: (e: MouseEvent) => void;
    private onMouseMove: (e: MouseEvent) => void;
    private onPointerLockChange: () => void;

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
            if (this.isPointerLocked) {
                this.mouseDX += e.movementX;
                this.mouseDY += e.movementY;
                this.mouseMoved = true;
            }
        };

        this.onPointerLockChange = () => {
            this.isPointerLocked = document.pointerLockElement !== null;
        };

        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
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

    requestPointerLock(): void {
        document.body.requestPointerLock();
    }

    dispose(): void {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    }
}