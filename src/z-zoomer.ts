import { LitElement, PropertyValueMap, css, html } from 'lit';
import { customElement, eventOptions, property, state } from 'lit/decorators.js';

const debounce = (cb: Function, delay: number = 1000) => {
    let timer: number;
    return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            cb(...args);
        }, delay);
    };
};

const clamp = (nb: number, { min = -Infinity, max = Infinity }) => {
    return Math.max(min, Math.min(nb, max));
}

@customElement('z-zoomer')
export class ZZoomer extends LitElement {
    /*
     * =========== Props
     */
    @property({ type: Boolean })
    disabled = false;

    @property({ type: Number })
    max = 10;

    private _touch = {
        initialZoom: 1,
        initialX: 0,
        initialY: 0,
        startX: 0,
        startY: 0,
        startX1: 0,
        startX2: 0,
        startY1: 0,
        startY2: 0,
        moveX: 0,
        moveY: 0,
        pinch: false,
        validated: false,
    };

    private _mouse = {
        initialX: 0,
        initialY: 0,
        startX: 0,
        startY: 0,
        moveX: 0,
        moveY: 0,
        validated: false,
        isDragging: false,
    };

    /**
     * =========== data
     */
    private _resizeObserver!: ResizeObserver;

    @state()
    zoom: number = 1;

    @state()
    isZoomed: Boolean = false;

    @state()
    translation: { x: number, y: number } = { x: 0, y: 0 };

    @state()
    isMoving: Boolean = false;

    @state()
    isMovingTouch: Boolean = false;

    @state()
    isMovingMouse: Boolean = false;

    /*
     * =========== Lifecycle
     */
    override firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        // safe max value
        this.max = clamp(this.max, { min: 1 });

        // react to element resize
        this._resizeObserver = new ResizeObserver(this._debouncedOnResize.bind(this))
        this._resizeObserver.observe(this);

        super.firstUpdated(_changedProperties);
    }

    override updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        if (_changedProperties.has('max')) {
            this.max = clamp(this.max, { min: 1 });
        }

        if (_changedProperties.has('zoom')) {
            const newVal = this.zoom;
            const oldVal = _changedProperties.get('zoom');

            if (newVal !== 1 && oldVal === 1 || newVal === 1 && oldVal !== 1) {
                this.isZoomed = newVal !== 1;
                this.dispatchEvent(new CustomEvent('zoomchange', { detail: { isZoomed: this.isZoomed } }))
            }
        };

        if (_changedProperties.has('isMovingTouch') || _changedProperties.has('isMovingMouse')) {
            const newValMouse = this.isMovingMouse;
            const newValTouch = this.isMovingTouch;

            this.isMoving = newValMouse || newValTouch;
        }

        super.update(_changedProperties);
    }

    override disconnectedCallback(): void {
        this._resizeObserver.disconnect();

        super.disconnectedCallback();
    }

    /*
     * =========== Methods
     */
    private _debouncedOnResize = debounce(this._onResize.bind(this), 200);
    private _onResize() {
        this._setTranslation(this.translation.x, this.translation.y);
    }

    private _onWheel(e: WheelEvent) {
        if (this.disabled) return;

        e.preventDefault(); // prevent the page from scrolling when zooming

        if(this._mouse.isDragging) return;

        if (e.deltaY !== 0) e.deltaY < 0 ? this.zoomIn() : this.zoomOut();
    }

    private onDblClick() {
        if (this.disabled) return;

        if(!this.isZoomed) this._setZoom(3)
        else this._setZoom(1);
    }

    private _onTouchStart(e: TouchEvent) {
        if (this.disabled) return;

        this._touch.initialZoom = this.zoom;
        this._touch.initialX = this.translation.x;
        this._touch.initialY = this.translation.y;

        if (e.touches.length > 1) this._touch.pinch = true

        this._touch.startX = e.touches[0].clientX;
        this._touch.startY = e.touches[0].clientY;

        this.isMovingTouch = true;
    }

    private _onTouchMove(e: TouchEvent) {
        if (this.disabled) return;

        e.preventDefault();

        if (!this._touch.pinch) { // 1 finger
            this._touch.moveX = e.touches[0].clientX;
            const deltaX = this._touch.moveX - this._touch.startX;
            this._touch.moveY = e.touches[0].clientY;
            const deltaY = this._touch.moveY - this._touch.startY;

            // start moving the content only when the touch is validated
            if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) this._touch.validated = true;

            if (this._touch.validated) {
                this._setTranslation(
                    this._touch.initialX + (deltaX / this.zoom),
                    this._touch.initialY + (deltaY / this.zoom)
                );
            }
        } else { // 2 fingers
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const initialDistance = Math.hypot(this._touch.startX1 - this._touch.startX2, this._touch.startY1 - this._touch.startY2);
            const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

            const deltaDistance = 1 + (currentDistance - initialDistance) * 0.01;

            // if movement has been validated before & there is still at least 2 fingers on the screen
            if (this._touch.validated && !!touch1 && !!touch2) {
                // zoom
                const newZoom = clamp(this.zoom * deltaDistance, { min: 1, max: this.max });

                this._setZoom(newZoom);

                // translation
                const deltaX1 = touch1.clientX - this._touch.startX1;
                const deltaY1 = touch1.clientY - this._touch.startY1;
                const deltaX2 = touch2.clientX - this._touch.startX2;
                const deltaY2 = touch2.clientY - this._touch.startY2;

                const newX = this.translation.x + ((deltaX1 + deltaX2) / 2) / this.zoom;
                const newY = this.translation.y + ((deltaY1 + deltaY2) / 2) / this.zoom;

                this._setTranslation(newX, newY);
            }

            // validate if there are 2 fingers on the element & the delta distance is different than 1
            const touch1Valid = !!touch1 && document.elementFromPoint(touch1.clientX, touch1.clientY) === this;
            const touch2Valid = !!touch2 && document.elementFromPoint(touch2.clientX, touch2.clientY) === this;

            this._touch.validated = touch1Valid && touch2Valid && deltaDistance !== 1;

            // get ready for next movement
            this._touch.startX1 = touch1.clientX;
            this._touch.startY1 = touch1.clientY;
            this._touch.startX2 = touch2.clientX;
            this._touch.startY2 = touch2.clientY;
        }
    }

    private _onTouchEnd() {
        if (this.disabled) return;

        // Reset 1 finger
        this._touch.startX = 0;
        this._touch.startY = 0;
        this._touch.moveX = 0;
        this._touch.moveY = 0;

        // reset 2 fingers
        this._touch.startX1 = 0;
        this._touch.startY1 = 0;
        this._touch.startX2 = 0;
        this._touch.startY2 = 0;

        this._touch.pinch = false;
        this._touch.validated = false;
        this.isMovingTouch = false;
    }

    @eventOptions({ capture: true })
    private _onMouseDown(e: MouseEvent) {
        if (this.disabled ) return;

        this._mouse.initialX = this.translation.x;
        this._mouse.initialY = this.translation.y;
        this._mouse.startX = e.clientX;
        this._mouse.startY = e.clientY;
        this.isMovingMouse = true;
    }

    private _onMouseMove(e: MouseEvent) {
        if (this.disabled) return;

        if (this.isMovingMouse && this.zoom !== 1) {
            this._mouse.moveX = e.clientX
            const deltaX = this._mouse.moveX - this._mouse.startX;
            this._mouse.moveY = e.clientY
            const deltaY = this._mouse.moveY - this._mouse.startY;

            if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) this._mouse.validated = true;

            if (this._mouse.validated) {
                this._setTranslation(
                    this._mouse.initialX + (deltaX / this.zoom),
                    this._mouse.initialY + (deltaY / this.zoom),
                );
            }
        }
    }

    private _onMouseUp() {
        if (this.disabled) return;

        // reset mouse values
        this._mouse.startX = 0;
        this._mouse.startY = 0;
        this._mouse.moveX = 0;
        this._mouse.moveY = 0;
        this._mouse.validated = false;
        this.isMovingMouse = false;
    }

    private _onMouseLeave() {
        if (this._mouse.validated) {
            this._mouse.validated = false;
            this.isMovingMouse = false;
        }
    }

    zoomIn() {
        this._setZoom(this.zoom * 1.25);
    }

    zoomOut() {
        this._setZoom(this.zoom * 0.75);
    }

    reset() {
        this._setZoom(1);
    }

    private _setZoom(value: number) {
        this.zoom = clamp(value, { min: 1, max: this.max });

        this._setTranslation(this.translation.x, this.translation.y);
    }

    private _setTranslation(x: number, y: number) {
        const xLimit = (this.clientWidth - (this.clientWidth / this.zoom)) / 2;
        const yLimit = (this.clientHeight - (this.clientHeight / this.zoom)) / 2;

        this.translation = {
            x: clamp(x, { min: xLimit * -1, max: xLimit}),
            y: clamp(y, { min: yLimit * -1, max: yLimit }),
        };
    }

    /**
     * =========== Template
     */
    render() {
        return html`
            <div
                class="zoomer"
                part="zoomer ${this.isZoomed ? 'zoomer--is-zoomed' : ''} ${this.isMoving ? 'zoomer--is-mooving' : ''} ${this.disabled ? 'zoomer--disabled' : ''}"
                style="
                    transform: scale(${this.zoom}) translate(${this.translation.x}px, ${this.translation.y}px);
                    transition: ${(this.isMoving) ? 'none' : 'transform .3s'};
                "
                @wheel="${this._onWheel}"
                @dblclick="${this.onDblClick}"
                @touchstart="${this._onTouchStart}"
                @touchmove="${this._onTouchMove}"
                @touchend="${this._onTouchEnd}"
                @mousedown="${this._onMouseDown}"
                @mousemove="${this._onMouseMove}"
                @mouseup="${this._onMouseUp}"
                @mouseleave="${this._onMouseLeave}">
                <slot></slot>
            </div>
        `
    }

    /**
     * =========== Style
     */
    static styles = css`
        :host {
            position: relative;
            display: block;
            overflow: hidden;
        }

        .zoomer {
            box-sizing: border-box;
            transform-origin: 50% 50%;
            transform: scale(1) translate(0, 0);
            width: 100%;
            height: 100%;
        }
    `
}

declare global {
    interface HTMLElementTagNameMap {
        'z-zoomer': ZZoomer,
    }
}
