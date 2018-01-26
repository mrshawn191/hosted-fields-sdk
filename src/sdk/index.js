import $ from 'jquery';
import { actions } from './actions';

export function HostedFieldsSdk () {
    // The payment iq mid
    var merchantId;
    // List of fields to host
    var fields;
    // Url to the hosted fields
    var hostedfieldsurl;
    // Service
    var service;
    // External styles for hosted fields.
    var styles;
    // The hosted fields.
    var targets = [];
    // Responses gotten from the hosted fields.
    var responses = [];
    // Element to render the hosted fields on.
    var el;
    // Method to call when all responses from hosted fields
    // has been collected.
    var callback;
    // This window.
    var window = document.parentWindow || document.defaultView;

    function setup (config) {
        merchantId = config.merchantId;
        hostedfieldsurl = config.hostedfieldsurl;
        fields = config.fields;
        service = config.service;
        styles = config.styles;
        callback = config.callback;
        el = config.el

        initIframes();
    }

    function pay () {
        targets.forEach((target) => {
            target.target.postMessage({action: actions.pay, merchantId: merchantId, id: target.id}, '*');
        })
    }

    function initIframes () {
        targets = targets.concat(fields.map((field) => {
            return initIframe(field)
        }))
    }

    function eventHandler ($event) {

        switch ($event.data.action) {
            case actions.formData:
                responses.push({ id: $event.data.id, data: $event.data.formData })
                sendCallback()
                break;
            case actions.formSubmit:
                pay()
                break;
        }
    }

    function sendCallback () {
        var responseIds = responses.map((response) => response.id);
        var targetIds = targets.map((target) => target.id);
        if (responseIds.length !== targetIds.length) return;
        var includesAllIds = true;
        targetIds.forEach((targetId) => {
            includesAllIds = responseIds.includes(targetId);
        });
        
        // Check that we have gotten responses from all hosted fields.
        // Before sending the callback.
        if (includesAllIds) {
            const data = responses.reduce((formData, response) => { 
              formData = { ...formData, ...response.data }; 
              return formData; 
            }, {});
            // Reset the responses.
            responses = []
            callback()(data);
        }
    }

    function initIframe (field) {
        var iframe = document.createElement('iframe');
        iframe.id = 'paymentiq-hosted-field-' + field.id;
        iframe.name = 'paymentiq-hosted-field-' + field.id;

        // This is hostedfieldsurl
        iframe.src = hostedfieldsurl + '?mid=' + merchantId;
        var container = document.querySelector(el);

        var iframeContainerEl = document.createElement('div');
        iframeContainerEl.id = 'hosted-input-' + field.id
        iframeContainerEl.className = 'hosted-input'
        iframeContainerEl.appendChild(iframe)

        container.appendChild(iframeContainerEl);

        // Get the target window...
        var target = document.querySelector('#'+iframe.id).contentWindow;
        // Attach onload event listener to iframe so we can send the 
        // setupContent event when iframe is fully loaded.
        iframe.onload = createIframeProxy.bind(this, field, target)
        return {
            id: iframe.id, target
        }
    }

    function createIframeProxy (field, target) {
        var fields = {};
        fields[field.name] = field;
        window.addEventListener("message", eventHandler, false)
        target.postMessage({
            action: actions.setupContent,
            styles: styles,
            fields: fields,
            service: service
        }, '*');
    }

    return {
        // Setup hosted fields
        setup,
        // Get the data from the hosted fields.
        pay
    }
};