const { chromium } = require("playwright");
const base = process.env.APP_QA_BASE_URL || "http://localhost:5173";

// Goods need a price and at least one photo. Jobs and services (optional:true)
// show the same two fields but may be posted without them, and drop the
// condition, options and vehicle fields.
const cases = [
  { cat:"serv", sub:"plumber", visible:["postPhotosField","postPriceField","postCurrencyField"], hidden:["postConditionField","postOptionsField","vehicleFields"], optional:true },
  { cat:"job", sub:"hiring", visible:["postPhotosField","postPriceField","postCurrencyField"], hidden:["postConditionField","postOptionsField","vehicleFields"], optional:true },
  { cat:"voit", sub:"car-sale", visible:["postPhotosField","postPriceField","postCurrencyField","postConditionField","postOptionsField","vehicleFields"] },
  { cat:"voit", sub:"auto-parts", visible:["postPhotosField","postPriceField","postConditionField"], hidden:["vehicleFields"] },
  { cat:"immo", sub:"sale-house", visible:["postPhotosField","postPriceField","postCurrencyField","postOptionsField"], hidden:["postConditionField","vehicleFields"] },
  { cat:"beauty", sub:"hairdresser", visible:["postPhotosField","postPriceField","postCurrencyField"], hidden:["postConditionField","postOptionsField","vehicleFields"], optional:true },
  { cat:"beauty", sub:"beauty-products", visible:["postPhotosField","postPriceField","postConditionField"] },
  { cat:"food", sub:"catering", visible:["postPhotosField"], hidden:["postPriceField","postCurrencyField","postConditionField","postOptionsField","vehicleFields"], optional:true },
  { cat:"food", sub:"prepared-food", visible:["postPhotosField"], hidden:["postPriceField","postCurrencyField","postConditionField"] },
  { cat:"pets", sub:"pet-services", visible:["postPhotosField","postPriceField","postCurrencyField"], hidden:["postConditionField","postOptionsField","vehicleFields"], optional:true },
  { cat:"pets", sub:"pet-supplies", visible:["postPhotosField","postPriceField","postConditionField"] }
];

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const results = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport:{ width:1280, height:900 } });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.goto(`${base}${path}?local=1&admin=1`, { waitUntil:"domcontentloaded" });
    await page.evaluate(() => openPostModal());
    await page.locator("#postModal.open").waitFor();

    for (const testCase of cases) {
      await page.selectOption("#newCat", testCase.cat);
      if(testCase.sub) await page.selectOption("#newSubcat", testCase.sub);
      const state = await page.evaluate(({ visible=[], hidden=[] }) => ({
        visible:Object.fromEntries(visible.map(id => [id, !document.getElementById(id).hidden])),
        hidden:Object.fromEntries(hidden.map(id => [id, document.getElementById(id).hidden])),
        hasVisibleSideField:[...document.querySelectorAll("label")].some(label => label.getAttribute("for") === "newSide" && label.offsetParent !== null),
        hasDutchArea:[...document.getElementById("newArea").options].some(option => option.value === "Philipsburg"),
        hasFrenchArea:[...document.getElementById("newArea").options].some(option => option.value === "Marigot"),
        removedFieldsMissing:["postDeliveryField","postMeetupField","newDelivery","newMeetup","newVehicleBody","newVehicleMechanical","newVehicleDocs"].every(id => !document.getElementById(id)),
        priceRequired:document.getElementById("newPrice").required,
        photoRequired:postFieldProfile(document.getElementById("newCat").value, document.getElementById("newSubcat").value).photosRequired
      }), testCase);
      Object.entries(state.visible).forEach(([id, ok]) => { if(!ok) errors.push(`${path} ${testCase.cat}/${testCase.sub}: ${id} should be visible`); });
      Object.entries(state.hidden).forEach(([id, ok]) => { if(!ok) errors.push(`${path} ${testCase.cat}/${testCase.sub}: ${id} should be hidden`); });
      const expectsPrice = (testCase.visible || []).includes("postPriceField") && !testCase.optional;
      if(state.priceRequired !== expectsPrice) errors.push(`${path} ${testCase.cat}/${testCase.sub}: incorrect price requirement`);
      if(state.photoRequired !== !testCase.optional) errors.push(`${path} ${testCase.cat}/${testCase.sub}: incorrect photo requirement`);
      if(state.hasVisibleSideField) errors.push(`${path} ${testCase.cat}/${testCase.sub}: side field should not be visible`);
      if(!state.removedFieldsMissing) errors.push(`${path} ${testCase.cat}/${testCase.sub}: removed fields should not exist`);
      if(!state.hasFrenchArea) errors.push(`${path} ${testCase.cat}/${testCase.sub}: missing French side areas`);
      if(!state.hasDutchArea) errors.push(`${path} ${testCase.cat}/${testCase.sub}: missing Dutch side areas`);
      results.push({ path, category:testCase.cat, subcategory:testCase.sub, ...state });
    }
    await page.close();
  }

  console.log(JSON.stringify({ errors, checked:results.length }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
