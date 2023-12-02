var apkFile;
var unz;

class WebAndroid {
  init(onSuccess, onError) {
    const script = document.createElement('script');
    script.src = 'https://cdn.bootcdn.net/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.body.appendChild(script);
    script.onload = function (){
        onSuccess();
      }
      script.onerror = function (message, source, lineno, colno, error){
          onError(message, source, lineno, colno, error);
        }
      }

      loadAPK(apkData,screenDiv) {
        this.init(() => {
          try {
            screenDiv.style.backgroundColor = "#ffffff";
            apkFile = apkData;
            this.readFile("AndroidManifest.xml", "string").then((axml) => {
                const AMxml = convert(axml);
                console.log(AMxml);
              });
            }catch(err){
              console.log(err);
            }
          },
          (message, source, lineno, colno, error) => {
            console.log(message, source, lineno, colno, error);
          }
          );
        }

        readFile(path, type = "blob") {
          var promise = new Promise (function(resolve, reject){
              unz = new JSZip();
              unz.loadAsync(apkFile).then((zip) => {
                  zip.file(path).async(type).then((content) => {
                      resolve(content);
                    });
                  },(e) => {
                    console.log(e);
                  });
                })
                return promise;
              }
}