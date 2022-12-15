import { LightningElement, api, track } from 'lwc';

export default class EventUsageMetricsFilters extends LightningElement {
    hasBeforeTime = false;
    hasAfterTime = false;
    beforeTime;
    afterTime;

    @track
    eventTypeOptions = [];

    @api
    set eventTypes(value) {
        this.eventTypeOptions = value.map((e) => {
            const option = { ...e };
            option.style = `background-color: ${option.color};`;
            option.checked = true;
            return option;
        });
    }
    get eventTypes() {
        return this.eventTypeOptions;
    }

    connectedCallback() {
        const now = new Date();
        now.setMinutes(0);
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        this.beforeTime = now.toISOString();
        this.afterTime = yesterday.toISOString();
    }

    notifyFilterChange() {
        const beforeTime =
            this.hasBeforeTime && this.beforeTime
                ? new Date(this.beforeTime).getTime()
                : undefined;
        const afterTime =
            this.hasAfterTime && this.afterTime
                ? new Date(this.afterTime).getTime()
                : undefined;
        const eventTypes = this.eventTypeOptions.map((e) => e.checked);
        const filters = {
            beforeTime,
            afterTime,
            eventTypes
        };
        const filterEvent = new CustomEvent('filterchange', {
            detail: filters
        });
        this.dispatchEvent(filterEvent);
    }

    handleClearFilters() {
        this.hasBeforeTime = false;
        this.hasAfterTime = false;
        this.beforeTime = undefined;
        this.afterTime = undefined;
        this.eventTypeOptions = this.eventTypeOptions.map((e) => {
            const option = { ...e };
            option.checked = true;
            return option;
        });
        this.notifyFilterChange();
    }

    handleAfterTimeToggle(event) {
        this.hasAfterTime = event.target.checked;
        this.notifyFilterChange();
    }

    handleBeforeTimeToggle(event) {
        this.hasBeforeTime = event.target.checked;
        this.notifyFilterChange();
    }

    handleAfterTimeChange(event) {
        this.afterTime = event.detail.value;
        this.notifyFilterChange();
    }

    handleBeforeTimeChange(event) {
        this.beforeTime = event.detail.value;
        this.notifyFilterChange();
    }

    handleEventTypeToggle(event) {
        const { checked } = event.target;
        const { index } = event.target.dataset;
        this.eventTypeOptions[index].checked = checked;
        this.notifyFilterChange();
    }

    get afterTimeDisabled() {
        return !this.hasAfterTime;
    }

    get beforeTimeDisabled() {
        return !this.hasBeforeTime;
    }
}
