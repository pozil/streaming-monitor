import { LightningElement, api } from 'lwc';

export default class Subscriptions extends LightningElement {
    @api subscriptions;

    handleUnsubscribe(event) {
        const channel = event.target.name;
        const unsubscribEvent = new CustomEvent('unsubscribe', {
            detail: { channel }
        });
        this.dispatchEvent(unsubscribEvent);
    }

    handleUnsubscribeAll() {
        this.dispatchEvent(new CustomEvent('unsubscribeall'));
    }

    get subscriptionCount() {
        return this.subscriptions.length;
    }
}