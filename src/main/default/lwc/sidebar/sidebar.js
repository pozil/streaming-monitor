import { LightningElement, api } from 'lwc';

export default class Sidebar extends LightningElement {
    isSidebarVisible = true;
    @api selectedItem = 'monitor';
    _selectedItem;

    handleToggleSidebar() {
        this.isSidebarVisible = !this.isSidebarVisible;
        const toggleEvent = new CustomEvent('toggle', {
            detail: this.isSidebarVisible
        });
        this.dispatchEvent(toggleEvent);
    }

    handleMenuSelect(event) {
        const selection = event.detail.name;
        if (selection !== this._selectedItem) {
            const navigateEvent = new CustomEvent('navigate', {
                detail: selection
            });
            this.dispatchEvent(navigateEvent);
            this._selectedItem = selection;
        }
    }

    get isSidebarHidden() {
        return !this.isSidebarVisible;
    }

    get splitViewContainerClasses() {
        return (
            'slds-split-view_container slds-is-' +
            (this.isSidebarVisible ? 'open' : 'closed')
        );
    }

    get toggleButtonClasses() {
        return (
            'slds-button slds-button_icon slds-button_icon slds-split-view__toggle-button slds-is-' +
            (this.isSidebarVisible ? 'open' : 'closed')
        );
    }
}
