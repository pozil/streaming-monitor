import { LightningElement, api } from 'lwc';

export default class Modal extends LightningElement {
    @api title;
    @api hideCloseIcon;
    @api width;
    @api isDirectional;

    isVisible = false;
    hasFooter = false;
    keyUpHandler;

    @api show() {
        this.isVisible = true;
    }

    @api hide() {
        this.isVisible = false;
    }

    connectedCallback() {
        this.keyUpHandler = window.addEventListener('keyup', (event) => {
            // Close modal when escape key is pressed
            if (this.isVisible && event.code === 'Escape') {
                this.handleCloseModal();
            }
        });
    }

    disconnectedCallback() {
        window.removeEventListener(this.keyUpHandler);
    }

    handleCloseModal() {
        this.hide();
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSlotTaglineChange() {
        const taglineEl = this.template.querySelector('header>p');
        taglineEl.classList.remove('slds-hide');
    }

    handleSlotFooterChange() {
        this.hasFooter = true;
    }

    get modalClass() {
        return `slds-modal slds-fade-in-open ${
            this.width ? 'slds-modal_' + this.width : ''
        } ${this.isVisible ? '' : 'slds-hide'}`;
    }

    get headerClass() {
        return `slds-modal__header ${
            this.title ? '' : 'slds-modal__header--empty'
        }`;
    }

    get footerClass() {
        return `slds-modal__footer ${this.hasFooter ? '' : 'slds-hide'} ${
            this.isDirectional ? 'slds-modal__footer_directional' : ''
        }`;
    }

    get backdropClass() {
        return `slds-backdrop slds-backdrop--open ${
            this.isVisible ? '' : 'slds-hide'
        }`;
    }
}
