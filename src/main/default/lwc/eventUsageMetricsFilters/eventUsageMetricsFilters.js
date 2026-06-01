import { LightningElement, api, track } from 'lwc';
import isEnhancedUsageMetricEnabled from '@salesforce/apex/StreamingMonitorController.isEnhancedUsageMetricEnabled';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export default class EventUsageMetricsFilters extends LightningElement {
    isEnhancedUsageMetricEnabled = false;
    timeSegment = 'Hourly';
    hasDateRangeFilter = false;
    beforeTime;
    afterTime;

    @track
    eventTypeOptions = [];

    @api
    set eventTypes(value) {
        this.eventTypeOptions = value.map((e) => ({
            ...e,
            style: `background-color: ${e.color};`,
            checked: true
        }));
    }
    get eventTypes() {
        return this.eventTypeOptions;
    }

    async connectedCallback() {
        const now = new Date();
        now.setMinutes(0);
        const yesterday = new Date(now.getTime() - ONE_DAY_MS);
        this.beforeTime = now.toISOString();
        this.afterTime = yesterday.toISOString();

        this.isEnhancedUsageMetricEnabled =
            await isEnhancedUsageMetricEnabled();
    }

    notifySearchFilterChange() {
        if (this.validateDateRange()) {
            return;
        }
        const beforeTime =
            this.hasDateRangeFilter && this.beforeTime
                ? new Date(this.beforeTime).getTime()
                : undefined;
        const afterTime =
            this.hasDateRangeFilter && this.afterTime
                ? new Date(this.afterTime).getTime()
                : undefined;
        const filters = {
            beforeTime,
            afterTime,
            timeSegment: this.timeSegment
        };
        const filterEvent = new CustomEvent('searchfilterchange', {
            detail: filters
        });
        this.dispatchEvent(filterEvent);
    }

    notifyDisplayFilterChange() {
        const unchecked = this.eventTypeOptions.filter((e) => !e.checked);
        const eventNames =
            unchecked.length > 0
                ? this.eventTypeOptions
                      .filter((e) => e.checked)
                      .map((e) => e.name)
                : null;
        const filters = {
            eventNames
        };
        const filterEvent = new CustomEvent('displayfilterchange', {
            detail: filters
        });
        this.dispatchEvent(filterEvent);
    }

    handleTimeSegmentChange(event) {
        this.timeSegment = event.detail.value;
        this.notifySearchFilterChange();
    }

    handleClearFilters() {
        this.hasDateRangeFilter = false;
        this.beforeTime = undefined;
        this.afterTime = undefined;
        this.timeSegment = 'Hourly';
        this.eventTypeOptions = this.eventTypeOptions.map((e) => {
            const option = { ...e };
            option.checked = true;
            return option;
        });
        this.notifySearchFilterChange();
        this.notifyDisplayFilterChange();
    }

    handleDateRangeToggle(event) {
        this.hasDateRangeFilter = event.target.checked;
        this.notifySearchFilterChange();
    }

    handleAfterTimeChange(event) {
        this.afterTime = this.sanitizeTime(event.detail.value);
        this.notifySearchFilterChange();
    }

    handleBeforeTimeChange(event) {
        this.beforeTime = this.sanitizeTime(event.detail.value);
        this.notifySearchFilterChange();
    }

    handleEventTypeToggle(event) {
        const { checked } = event.target;
        const { index } = event.target.dataset;
        this.eventTypeOptions[index].checked = checked;
        this.notifyDisplayFilterChange();
    }

    sanitizeTime(originalTimeString) {
        let sanitizedDate = new Date(originalTimeString);
        switch (this.timeSegment) {
            case 'Daily':
                sanitizedDate.setHours(0, 0, 0, 0);
                break;
            case 'Hourly':
                sanitizedDate.setMinutes(0, 0, 0);
                break;
            case 'FifteenMinutes':
                sanitizedDate.setMinutes(0, 0, 0);
                break;
            default:
                break;
        }
        return sanitizedDate.toISOString();
    }

    validateDateRange() {
        if (!this.hasDateRangeFilter || !this.afterTime || !this.beforeTime) {
            return null;
        }
        const rangeMs =
            new Date(this.beforeTime).getTime() -
            new Date(this.afterTime).getTime();

        if (rangeMs <= 0) {
            return 'Before time must be after After time.';
        }
        if (rangeMs >= 60 * ONE_DAY_MS) {
            return 'Range cannot be greater than 60 days.';
        }

        switch (this.timeSegment) {
            case 'Daily':
                if (rangeMs < ONE_DAY_MS) {
                    return 'Daily segment requires a date range of at least 24 hours.';
                }
                break;
            case 'Hourly':
                if (rangeMs < ONE_HOUR_MS || rangeMs > ONE_DAY_MS) {
                    return 'Hourly segment requires a date range between 1 hour and 24 hours.';
                }
                break;
            case 'FifteenMinutes':
                if (rangeMs < FIFTEEN_MIN_MS || rangeMs > ONE_HOUR_MS) {
                    return 'Fifteen Minutes segment requires a date range between 15 minutes and 1 hour.';
                }
                break;
            default:
                break;
        }
        return null;
    }

    get dateRangeError() {
        return this.validateDateRange();
    }

    get timeSegmentOptions() {
        return [
            { label: 'Daily', value: 'Daily' },
            { label: 'Hourly', value: 'Hourly' },
            { label: 'Fifteen Minutes', value: 'FifteenMinutes' }
        ];
    }

    get isTimeSegmentDisabled() {
        return !this.isEnhancedUsageMetricEnabled;
    }

    get dateRangeDisabled() {
        return !this.hasDateRangeFilter;
    }
}
