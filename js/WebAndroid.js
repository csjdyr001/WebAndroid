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
                //layout
                let layoutFileName;
                if(unz.file("res/layout/activity_main.xml").length > 0){
                  //activity_main.xml exist
                  layoutFileName = "activity_main.xml";//usually yes
                 }else{
                 //activity_main.xml not exist
                 //debug
                 const mAXT = new AndroidXmlTool(AMxml);
                 layoutFileName = getLayoutFileNameByClassName(mAXT.getMainActivity());//Gets the layout file name?
                 }
                 console.log(layoutFileName);
                if(unz.file("res/layout/" + layoutFileName).length > 0){
                 this.readFile("res/layout/" + layoutFileName, "string").then((axml1) => {
                const MainLayout = convert(axml1);
                console.log(MainLayout);
                //Do generate layout?
                
                });
              }else{
              //Can not recognize the layout?
              console.log("The layout file is not recognized, and a blank layout is used by default.");
              screenDiv.style.backgroundColor = "#ffffff";
              }
              });
            }catch(err){
              console.log(err);
            }
          },
          (message, source, lineno, colno, error) => {
            console.log(message, source, lineno, colno, error);
          });
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


class AndroidXmlTool {
  constructor(xml){
this.parser = new DOMParser();
this.xmlDoc = this.parser.parseFromString(xml, "text/xml");
}

getPackageName() {
return this.xmlDoc.querySelector("manifest").getAttribute("package");
}

getPermissionArray(){
const permissions = this.xmlDoc.querySelectorAll("uses-permission");
let nameList1 = [];
permissions.forEach(permission => {
    nameList1.push(permission.getAttribute("android:name"));
});
return nameList1;
}

getActivityArray(){
const activities = this.xmlDoc.querySelectorAll("activity");
let nameList2 = [];
activities.forEach(activity => {
    nameList2.push(activity.getAttribute("android:name"));
});
return nameList2;
}

getServiceArray(){
const services = this.xmlDoc.querySelectorAll("service");
let nameList3 = [];
services.forEach(service => {
    nameList3.push(service.getAttribute("android:name"));
});
return nameList3;
}

getProviderArray(){
const providers = this.xmlDoc.querySelectorAll("provider");
let nameList4 = [];
providers.forEach(provider => {
    nameList4.push(provider.getAttribute("android:authorities"));
});
return nameList4;
}

getMainActivity(){
let mainLauncherActivity;
const activities = this.xmlDoc.querySelectorAll("activity");
activities.forEach(activity => {
    const intentFilter = activity.querySelector("intent-filter");
    if (intentFilter) {
        const action = intentFilter.querySelector("action");
        if (action && action.getAttribute("android:name") === "android.intent.action.MAIN") {
            mainLauncherActivity = activity.getAttribute("android:name");
        }
    }
});
return mainLauncherActivity;
}

//and more…
}

function replaceRightmostText(input, searchText, replacement) {
    var regex = new RegExp(searchText + "(?!.*" + searchText + ")");
    return input.replace(regex, replacement);
}
function getLayoutFileNameByClassName(className){
return "activity_" + (replaceRightmostText((className.split("."))[(className.split(".")).length - 1],"Activity","")).toLowerCase() + ".xml";
}