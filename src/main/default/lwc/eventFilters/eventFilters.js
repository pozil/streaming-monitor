import { LightningElement, api } from 'lwc';

export default class EventFilters extends LightningElement {
    channelOptions = [];
    channel;
    payload;
    isCaseSensitive = false;
    hasBeforeTime = false;
    hasAfterTime = false;
    beforeTime;
    afterTime;

    @api
    set channels(values) {
        this.channelOptions = values.map((channel) => ({
            label: channel,
            value: channel
        }));
    }
    get channels() {
        return this.channelOptions.map((channel) => channel.value);
    }

    connectedCallback() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        this.beforeTime = now.toISOString();
        this.afterTime = yesterday.toISOString();
    }

    nofifyFilterChange() {
        let payload = this.payload ? this.payload.trim() : undefined;
        if (payload && payload.length === 0) {
            payload = undefined;
        }
        const beforeTime =
            this.hasBeforeTime && this.beforeTime
                ? new Date(this.beforeTime).getTime()
                : undefined;
        const afterTime =
            this.hasAfterTime && this.afterTime
                ? new Date(this.afterTime).getTime()
                : undefined;
        const filters = {
            channel: this.channel,
            payload,
            isCaseSensitive: this.isCaseSensitive,
            beforeTime,
            afterTime
        };
        const filterEvent = new CustomEvent('filterchange', {
            detail: filters
        });
        this.dispatchEvent(filterEvent);
    }

    handleClearFilters() {
        this.channel = undefined;
        this.payload = undefined;
        this.isCaseSensitive = false;
        this.hasBeforeTime = false;
        this.hasAfterTime = false;
        this.beforeTime = undefined;
        this.afterTime = undefined;
        this.nofifyFilterChange();
    }

    handleChannelChange(event) {
        this.channel = event.detail.value;
        this.nofifyFilterChange();
    }

    handlePayloadChange(event) {
        this.payload = event.detail.value;
        this.nofifyFilterChange();
    }

    handleIsCaseSensitiveChange(event) {
        this.isCaseSensitive = event.target.checked;
        this.nofifyFilterChange();
    }

    handleAfterTimeToggle(event) {
        this.hasAfterTime = event.target.checked;
        this.nofifyFilterChange();
    }

    handleBeforeTimeToggle(event) {
        this.hasBeforeTime = event.target.checked;
        this.nofifyFilterChange();
    }

    handleAfterTimeChange(event) {
        this.afterTime = event.detail.value;
        this.nofifyFilterChange();
    }

    handleBeforeTimeChange(event) {
        this.beforeTime = event.detail.value;
        this.nofifyFilterChange();
    }

    get afterTimeDisabled() {
        return !this.hasAfterTime;
    }

    get beforeTimeDisabled() {
        return !this.hasBeforeTime;
    }
}
