import { LightningElement } from 'lwc';

const VIEW_MODE_TABLE = 'table';
const VIEW_MODE_TIMELINE = 'timeline';
const VIEW_MODES = [
    { label: 'Table', value: VIEW_MODE_TABLE, iconName: 'utility:table' },
    {
        label: 'Timeline',
        value: VIEW_MODE_TIMELINE,
        iconName: 'utility:metrics'
    }
];

export default class EventsHeaderControls extends LightningElement {
    viewMode = VIEW_MODE_TABLE;
    viewModes = VIEW_MODES;
    isFiltersDisplayed = true;

    handleClear() {
        this.dispatchEvent(new CustomEvent('clear'));
    }

    handleFiltersDisplayToggle() {
        this.isFiltersDisplayed = !this.isFiltersDisplayed;
        const event = new CustomEvent('filtertoggle', {
            detail: { value: this.isFiltersDisplayed }
        });
        this.dispatchEvent(event);
    }

    handleViewModeSelect(event) {
        this.viewMode = event.detail.value;
        this.updateViewModeSelection();
        const changeEvent = new CustomEvent('viewmodechange', {
            detail: { value: this.viewMode }
        });
        this.dispatchEvent(changeEvent);
    }

    updateViewModeSelection() {
        this.viewModes = this.viewModes.map((option) => {
            option.checked = option.value === this._value;
            return option;
        });
    }

    get viewModeIconName() {
        const selectedOption = this.viewModes.find(
            (option) => option.value === this.viewMode
        );
        return selectedOption.iconName;
    }
}
