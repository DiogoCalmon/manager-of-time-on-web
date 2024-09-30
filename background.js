const sites = ["youtube", "reddit", "instagram", "discord", "whatsapp", "facebook"];
let timersOfSites = {};
let principalTimer = 0;
let final = false;
let stopwatch;

let hours;
let minutes;
let seconds;

// when this function is called, she return the object of currentWebsite (i explain with more detail on read.md) with details
function getCurrentTab() {
  return new Promise((resolve, reject) => {
      let queryOptions = {active: true, lastFocusedWindow: true};
      chrome.tabs.query(queryOptions, (tabs) => {
          if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
          } else {
              resolve(tabs[0]);
          }
      });
  });
}

// the name is self explanatory, the function catch the domain name
function extractDomain(url) {
  try {
    let parseUrl = new URL(url);
    let domainParts = parseUrl.hostname.split(".");
    
    return domainParts[0] == "www" || domainParts[0] == "web" ? domainParts[1] :  domainParts[0];
  }
  catch (error) {
    console.error("Erro ao extrair o domínio: " + error);
    return null;
  }
}

// this function storage on chrome.storage the total time wasted on web
function homeTimer() {
  console.log(principalTimer);
  chrome.storage.local.set({ "homeTimer": principalTimer }, () => {
    if (chrome.runtime.lastError) {
      console.error("Erro ao salvar homeTimer:", chrome.runtime.lastError);
    }
  });
}

// this function save the time of especifics divs
function saveTimersToStorage() {
  chrome.storage.local.set({ "timersOfSites": timersOfSites }, () => {
    if (chrome.runtime.lastError) {
      console.error("Erro ao salvar timers:", chrome.runtime.lastError);
    }
  });
}

// this function catch the times of divs
function loadTimersFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get("timersOfSites", (result) => {
      if (result.timersOfSites) {
        timersOfSites = result.timersOfSites;
      }
      resolve();
    });
  });
}

// here is the most important function, it's here where the current timer is implemented
function startTimer(site) {
 
  if (!timersOfSites[site]) {
    timersOfSites[site] = {
      hours: 0,
      minutes: 0,
      seconds: 0
    }
  }

  stopwatch = setInterval(() => {
    timersOfSites[site].seconds++;
    principalTimer++;
    if (timersOfSites[site].seconds >= 60) {
      timersOfSites[site].seconds = 0;
      timersOfSites[site].minutes++;
    }

    if (timersOfSites[site].minutes >= 60) {
      console.log("entrou nos minutos");
      timersOfSites[site].minutes = 0;
      timersOfSites[site].hours++;
    }

    saveTimersToStorage();
    homeTimer();
    
  }, 1000);
}

// this function has a objective of organize what to do when the domain changes
function timerLogic() {
  return new Promise((resolve, reject) => {
    try {
      loadTimersFromStorage().then(() => {
        chrome.storage.local.get("currentDomain", (result) => {
          domain = result.currentDomain;
          if (stopwatch) {
            clearInterval(stopwatch);
            stopwatch = undefined;
          }
          startTimer(domain)
          chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
              if (request.message === "getTimes") {
                sendResponse({ times: timersOfSites });
              } 
          });
        }); 
      })
      
    } catch (error) {
      reject("Erro na lógica do timer: " + error);
    }
  });
}

//listen when changing tabs
chrome.tabs.onActivated.addListener(activeInfo => {
  getCurrentTab().then(tab => {
    let url = tab.url;
    let domain = extractDomain(url);

    return new Promise((resolve, reject) => {
      if (!sites.includes(domain)) {
        chrome.storage.local.set({ "currentDomain": "others" }, resolve);
      } else {
        chrome.storage.local.set({ "currentDomain": domain }, resolve);
      }
    });
  }).then(() => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get("visitedSites", (result) => {
        let visitedSites = result.visitedSites || [];
        
        chrome.storage.local.get("currentDomain", (result) => {
          let currentSite = result.currentDomain;

          if (!visitedSites.includes(currentSite)) {
            if (sites.includes(currentSite) || currentSite === "others") {
              visitedSites.push(currentSite);

              chrome.storage.local.set({ "visitedSites": visitedSites }, () => {
                if (chrome.runtime.lastError) {
                  console.error("Erro ao salvar visitedSites:", chrome.runtime.lastError);
                }
                resolve();
              });
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        });
      });
    });
  }).then(() => {
    return timerLogic();
  }).then(() => {
    console.log("Lógica do timer concluída com sucesso.");
  }).catch(error => {
    console.error("Erro: " + error);
  });
});

// Listen when the tab update ( but don't chase tha tab )
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) { 
    getCurrentTab().then(tab => {
      let url = tab.url;
      let domain = extractDomain(url);
  
      return new Promise((resolve, reject) => {
        if (!sites.includes(domain)) {
          chrome.storage.local.set({ "currentDomain": "others" }, resolve);
        } else {
          chrome.storage.local.set({ "currentDomain": domain }, resolve);
        }
      });
    }).then(() => {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get("visitedSites", (result) => {
          let visitedSites = result.visitedSites || [];
          
          chrome.storage.local.get("currentDomain", (result) => {
            let currentSite = result.currentDomain;
  
            if (!visitedSites.includes(currentSite)) {
              if (sites.includes(currentSite) || currentSite === "others") {
                visitedSites.push(currentSite);
  
                chrome.storage.local.set({ "visitedSites": visitedSites }, () => {
                  if (chrome.runtime.lastError) {
                    console.error("Erro ao salvar visitedSites:", chrome.runtime.lastError);
                  }
                  resolve();
                });
              } else {
                resolve();
              }
            } else {
              resolve();
            }
          });
        });
      });
    }).then(() => {
      return timerLogic();
    }).then(() => {
      console.log("Lógica do timer concluída com sucesso.");
    }).catch(error => {
      console.error("Erro: " + error);
    });
  }
});

// sends a confirmation signal to the popup saying that all data has been stored
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "check") {
    let response = { verify: true };
    sendResponse(response);
    response = { verify: false };
  }
});

// listen when the extension is updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear()
});
