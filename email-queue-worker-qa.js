const assert = require("assert");
const { actionUrl, buildEmail, textOnly } = require("./scripts/send-email-queue");

const row = {
  id: "00000000-0000-0000-0000-000000000001",
  listing_id: 47,
  recipient_email: "seller@example.com",
  template: "listing-renewal",
  subject: "Votre annonce est-elle encore disponible ?",
  payload: {
    listing_id: 47,
    listing_title: "TMAX Icon Blue"
  }
};

const email = buildEmail(row, "https://buyselltradesxm.com");

assert.match(email.subject, /disponible/);
assert.match(email.subject, /available/);
assert.match(email.html, /TMAX Icon Blue/);
assert.match(email.html, /Votre annonce est-elle encore disponible/);
assert.match(email.html, /Is your listing still available/);
assert.match(email.html, /renew=keep/);
assert.match(email.html, /renew=sold/);
assert.match(email.html, /renew=delete/);
assert.match(email.html, /Yes, keep the listing/);
assert.match(email.html, /Mark as sold/);
assert.match(email.html, /Delete/);
assert.equal(actionUrl("https://buyselltradesxm.com", 47, "keep"), "https://buyselltradesxm.com/?listing=47&renew=keep");
assert(!/<[^>]+>/.test(textOnly("<p>Hello <b>world</b></p>")));

console.log(JSON.stringify({ errors: [] }, null, 2));
