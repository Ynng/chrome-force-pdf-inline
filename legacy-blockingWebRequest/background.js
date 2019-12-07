/*
 Force PDFs to render inline in Chrome (for the Stable channel).

 Note: This is a slower version than the Declarative Web Request extension at:
 https://chrome.google.com/webstore/detail/render-pdfs-inline/mpmmilbhemhehclnkpkfepmaikiolaab

 (Unfortunately, the DWR API isn't available on the Stable channel.)


 WARNING: This may have significant security implications. If you don't understand why, do NOT install this extension.

 Author: Nick Semenkovich <semenko@alum.mit.edu> | https://nick.semenkovich.com/
 License: MIT
 */

// Handle PDFs on non .pdf URLs.
chrome.webRequest.onHeadersReceived.addListener(function(details) {
    var responseHeaders = details.responseHeaders;
    var contentTypeIsPDF = false;
    var contentTypeIsOS = false;
    var contentNotInline = false;
    var attachmentIsPDF = false;
    var contentDispositionPosition = 0;
    var contentTypePosition = 0;
    var pdfURL = details.url.toLowerCase().endsWith('.pdf');
    responseHeaders.forEach(function(header, i) {
        switch (header.name.toLowerCase()) {
            case 'content-disposition':
                if (header.value.indexOf('inline') === -1) {
                    // We're not inline. Likely an attachment.
                    contentNotInline = true;
                    contentDispositionPosition = i;
                }
                if (/filename=.*\.pdf$/.test(header.value)) {
                    attachmentIsPDF = true;
                }
                break;
            case 'content-type':
                contentTypePosition = i;
                if (header.value.indexOf('application/pdf') !== -1) {
                    // It's a PDF! Let's note that.
                    contentTypeIsPDF = true;
                } else if (header.value.indexOf('application/octet-stream') !== -1) {
                    contentTypeIsOS = true;
                }
                break;
        }
    });
    console.log(contentTypeIsOS + " " + attachmentIsPDF + " " + contentNotInline);
    if (contentTypeIsPDF && contentNotInline) {
        // We are a PDF, but we're not inline. Let's set the inline header.
        if (details.responseHeaders[contentDispositionPosition].name.toLowerCase().indexOf('content-disposition') !== -1) {
            console.log('Injecting Content-Disposition inline header for:', details);
            details.responseHeaders[contentDispositionPosition].value = "inline";
        } else {
            console.warn('Unexpected error in responseHeaders for:', details);
        }
    } else if (contentTypeIsOS && (attachmentIsPDF || pdfURL) && contentNotInline) {
        // If there is an attachment with a pdf extension, we set the inline & application/pdf headers
        if (details.responseHeaders[contentTypePosition].name.toLowerCase().indexOf('content-type') !== -1) {
            console.log('Injecting Content-Type PDF header for:', details);
            details.responseHeaders[contentTypePosition].value = details.responseHeaders[contentTypePosition].value.replace('application/octet-stream', 'application/pdf');
        } else {
            console.warn('Unexpected error in responseHeaders for:', details);
        }
        if (details.responseHeaders[contentDispositionPosition].name.toLowerCase().indexOf('content-disposition') !== -1) {
            console.log('Injecting Content-Disposition inline header for:', details);
            details.responseHeaders[contentDispositionPosition].value = details.responseHeaders[contentDispositionPosition].value.replace('attachment', 'inline');
        } else {
            console.warn('Unexpected error in responseHeaders for:', details);
        }
    }
    return { responseHeaders: responseHeaders };
},
    // Catch anything, and we'll match content type above.
    {
        urls: ["http://*/*", "https://*/*"],
        types: ["main_frame"]
    },
    ["blocking", "responseHeaders"]
);
