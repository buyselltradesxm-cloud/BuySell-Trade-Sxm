const { chromium } = require("playwright");

const cases = [
  { cat:"serv", sub:"plumber", hidden:["postPhotosField","postPriceField","postCurrencyField","postConditionField","postDeliveryField","postMeetupField","postOptionsField","vehicleFields"] },
  { cat:"job", sub:"hiring", hidden:["postPhotosField","postPriceField","postCurrencyField","postConditionField","postDeliveryField","postMeetupField","postOptionsField","vehicleFields"] },
  { cat:"voit", sub:"car-sale", visible:["postPhotosField","postPriceField","postCurrencyField","postConditionField","postDeliveryField","postMeetupField","postOptionsField","vehicleFields"] },
  { cat:"voit", sub:"auto-parts", visible:["postPhotosField","postPriceField","postConditionField","postDeliveryField"], hidden:["vehicleFields"] },
  { cat:"immo", sub:"sale-house", visible:["postPhotosField","postPriceField","postCurrencyField","postOptionsField"], hidden:["postConditionField","postDeliveryField","postMeetupField","vehicleFields"] },
  { cat:"beauty", sub:"hairdresser", hidden:["postPhotosField","postPriceField","postCurrencyField","postConditionField","postDeliveryField","postMeetupField","postOptionsField"] },
  { cat:"beauty", sub:"beauty-products", visible:["postPhotosField","postPriceField","postConditionField","postDeliveryField"] },
  { cat:"food", sub:"catering", hidden:["postPhotosField","postPriceField","postCurrencyField","postConditionField","postDeliveryField","postMeetupField","postOptionsField"] },
  { cat:"food", sub:"prepared-food", visible:["postPhotosField","postPriceField","postDeliveryField"], hidden:["postConditionField"] },
  { cat:"pets", sub:"pet-services", hidden:["postPhotosField","postPriceField","postCurrencyField","postConditionField","postDeliveryField","postMeetupField","postOptionsField"] },
  { cat:"pets", sub:"pet-supplies", visible:["postPhotosField","postPriceField","postConditionField","postDeliveryField"] }
];

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const results = [];

  for (const path of ["/", "/marketplace.html"]) {
    const page = await browser.newPage({ viewport:{ width:1280, height:900 } });
    page.on("pageerror", error => errors.push(`${path}: ${error.message}`));
    await page.goto(`http://localhost:5173${path}?local=1&admin=1`, { waitUntil:"domcontentloaded" });
    await page.evaluate(() => openPostModal());
    await page.locator("#postModal.open").waitFor();

    for (const testCase of cases) {
      await page.selectOption("#newCat", testCase.cat);
      if(testCase.sub) await page.selectOption("#newSubcat", testCase.sub);
      const state = await page.evaluate(({ visible=[], hidden=[] }) => ({
        visible:Object.fromEntries(visible.map(id => [id, !document.getElementById(id).hidden])),
        hidden:Object.fromEntries(hidden.map(id => [id, document.getElementById(id).hidden])),
        areaValue:document.getElementById("newArea").value,
        hasDutchArea:[...document.getElementById("newArea").options].some(option => option.value === "Philipsburg"),
        priceRequired:document.getElementById("newPrice").required,
        photoRequired:postFieldProfile(document.getElementById("newCat").value, document.getElementById("newSubcat").value).photosRequired
      }), testCase);
      Object.entries(state.visible).forEach(([id, ok]) => { if(!ok) errors.push(`${path} ${testCase.cat}/${testCase.sub}: ${id} should be visible`); });
      Object.entries(state.hidden).forEach(([id, ok]) => { if(!ok) errors.push(`${path} ${testCase.cat}/${testCase.sub}: ${id} should be hidden`); });
      const expectsPrice = (testCase.visible || []).includes("postPriceField");
      if(state.priceRequired !== expectsPrice) errors.push(`${path} ${testCase.cat}/${testCase.sub}: incorrect price requirement`);
      if(!state.hasDutchArea) errors.push(`${path} ${testCase.cat}/${testCase.sub}: missing Dutch side areas`);
      if(!expectsPrice && !["Toute l'île","Whole island"].includes(state.areaValue)) errors.push(`${path} ${testCase.cat}/${testCase.sub}: service area should default to whole island`);
      results.push({ path, category:testCase.cat, subcategory:testCase.sub, ...state });
    }
    await page.close();
  }

  console.log(JSON.stringify({ errors, checked:results.length }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
