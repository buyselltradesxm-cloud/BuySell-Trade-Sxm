/* Buy Sell Trade Sxm — client-side image compression for listing photos.
 *
 * Shared by index.html and marketplace.html so there is a single source of
 * truth (see the two files' handlePhotoUpload). Phones hand us 3–12 MB photos
 * straight from the camera; without this a listing upload is 30–90 MB, blows
 * the localStorage quota in demo mode, and makes the buyer feed crawl.
 *
 * window.ImgUtils.compressForListing(file, opts) -> Promise<{
 *   file:File, dataUrl:string, width, height, bytes, optimized:boolean
 * }>
 * window.ImgUtils.compressMany(files, opts) -> Promise<Array<same>>
 */
(function () {
  'use strict';

  var DEFAULTS = {
    maxEdge: 1600,          // longest side, px — plenty for a full-screen detail view
    quality: 0.82,          // JPEG quality
    mime: 'image/jpeg',
    skipBelowBytes: 320 * 1024  // don't bother re-encoding an already-small photo
  };

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('read failed')); };
      r.readAsDataURL(blob);
    });
  }

  function closeBitmap(b) { if (b && typeof b.close === 'function') { try { b.close(); } catch (e) {} } }

  // Decode with EXIF orientation already applied where the browser supports it.
  function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return createImageBitmap(file, { imageOrientation: 'from-image' })
          .catch(function () { return decodeViaImg(file); });
      } catch (e) { /* older Safari throws on the options arg */ }
    }
    return decodeViaImg(file);
  }

  function decodeViaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        resolve(img);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('decode failed'));
      };
      img.src = url;
    });
  }

  function fitWithin(w, h, maxEdge) {
    if (Math.max(w, h) <= maxEdge) return { w: w, h: h };
    var s = maxEdge / Math.max(w, h);
    return { w: Math.round(w * s), h: Math.round(h * s) };
  }

  function renameToJpg(name) {
    return String(name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
  }

  function compressForListing(file, opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    if (!file || !/^image\//.test(file.type || '')) {
      return Promise.reject(new Error('not an image'));
    }

    return decode(file).then(function (src) {
      var sw = src.width, sh = src.height;
      var target = fitWithin(sw, sh, o.maxEdge);
      var sameSize = target.w === sw && target.h === sh;

      // Already small and no resize needed — ship it as-is.
      if (sameSize && file.size <= o.skipBelowBytes) {
        closeBitmap(src);
        return blobToDataUrl(file).then(function (dataUrl) {
          return { file: file, dataUrl: dataUrl, width: sw, height: sh, bytes: file.size, optimized: false };
        });
      }

      var canvas = document.createElement('canvas');
      canvas.width = target.w;
      canvas.height = target.h;
      var ctx = canvas.getContext('2d');
      if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, target.w, target.h);
      closeBitmap(src);

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('encode failed'));
        }, o.mime, o.quality);
      }).then(function (blob) {
        // If re-encoding didn't actually help (small already-JPEG), keep original.
        var keepOriginal = sameSize && blob.size >= file.size;
        var finalBlob = keepOriginal ? file : blob;
        var outFile = new File(
          [finalBlob],
          keepOriginal ? (file.name || 'photo.jpg') : renameToJpg(file.name),
          { type: finalBlob.type || o.mime, lastModified: Date.now() }
        );
        return blobToDataUrl(finalBlob).then(function (dataUrl) {
          return {
            file: outFile, dataUrl: dataUrl,
            width: target.w, height: target.h,
            bytes: finalBlob.size, optimized: !keepOriginal
          };
        });
      });
    });
  }

  function compressMany(files, opts) {
    var list = Array.prototype.slice.call(files || []);
    return list.reduce(function (chain, f) {
      return chain.then(function (acc) {
        return compressForListing(f, opts).then(
          function (res) { acc.push(res); return acc; },
          function (err) {
            console.warn('[img-utils] compress failed, using original:', err);
            return blobToDataUrl(f).catch(function () { return ''; }).then(function (dataUrl) {
              acc.push({ file: f, dataUrl: dataUrl, width: 0, height: 0, bytes: f.size || 0, optimized: false });
              return acc;
            });
          }
        );
      });
    }, Promise.resolve([]));
  }

  window.ImgUtils = { compressForListing: compressForListing, compressMany: compressMany, DEFAULTS: DEFAULTS };
})();
