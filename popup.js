let websites = [];
let savedDivElements = {};
let intervalOfPopup;

chrome.storage.local.get("visitedWebSites", (result) => {
  websites = result.visitedWebSites || [];
})

async function updatePopup(domain) {
  console.log(domain);
  console.log("estou dentro do update")

  await createAndSaveDiv(domain);
  await loadSavedDivs();
  await loadHomeTimer();
}

function createAndSaveDiv(site) {
  return new Promise((resolve, reject) => {
      let savedDivs = [];

      chrome.storage.local.get("visitedSites", (result) => {
        let visitedSites = result.visitedSites || [];
        let times;

        visitedSites.forEach(website => {
          savedDivs.push({
            site: website,
            icon: chooseIcon(website),
            timer: "00:00:00"
          });

          let indexSite = savedDivs.length - 1;

          intervalOfPopup = setInterval(() => {
            chrome.runtime.sendMessage({ message: "getTimes" }, (response) => {
              if (response && response.times && response.times[site]) {
                times = response.times[website];
                savedDivs[indexSite].timer = `${formatTime(times.hours)}:${formatTime(times.minutes)}:${formatTime(times.seconds)}`;

                chrome.storage.local.set({ savedDivs: savedDivs }, () => {
          
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                  }
                  resolve();
                });
              }
              else {
                console.error("null times")
              }
            })
          },200);
        
        })
      })
  });
}

// 
function loadSavedDivs() {

  chrome.storage.local.get("savedDivs", function (result) {
    console.log(result.savedDivs)
    if (result.savedDivs) {
      if (Array.isArray(result.savedDivs)) {
        result.savedDivs.forEach(function (divData) {

        const newBigDiv = document.createElement('div');
        newBigDiv.classList.add("info");
        newBigDiv.id = divData.site;

        const newSmallDiv = document.createElement('div');
        newSmallDiv.classList.add("app");

        const img = document.createElement("i");
        const iconClasses = divData.icon.split(" ");
        img.classList.add(...iconClasses);

        const h3 = document.createElement("h3");
        h3.textContent = divData.site;

        const h4 = document.createElement("h4");
        h4.textContent = divData.timer; // Carrega o tempo salvo
        h4.classList.add("timer");

        const line = document.createElement("div");
        line.classList.add("line");

        newSmallDiv.appendChild(img);
        newSmallDiv.appendChild(h3);

        newBigDiv.appendChild(newSmallDiv);
        newBigDiv.appendChild(h4);

        const container = document.querySelector(".activitys");
        container.appendChild(newBigDiv);
        container.appendChild(line);

        savedDivElements[divData.site] = h4;
      });

      startLiveTimerUpdate();
    }
  }
  });
}

// function for format the timer on top
function loadHomeTimer() {
  setInterval(() => {
  chrome.storage.local.get("homeTimer", (result) => {
    if (result.homeTimer) {
      const timerElement = document.getElementById("homeTimer");
        timerElement.textContent = formatTime(Math.trunc(result.homeTimer / 3600)) + ":" + formatTime(Math.trunc(result.homeTimer / 60) % 60);
      }
    });
  }, 200);
}

// function for update the value on html in real time
function startLiveTimerUpdate() {
  setInterval(() => {
    chrome.storage.local.get("savedDivs", (result) => {
      if (result.savedDivs) {
        result.savedDivs.forEach(divData => {
          const timerElement = savedDivElements[divData.site];
          if (timerElement) {
            timerElement.textContent = divData.timer;
          }
        });
      }
    });
  }, 1000);
}

// function that give a icon for html
function chooseIcon(site) {
  switch (site) {
    case "youtube":
      return "fab fa-youtube";
    case "instagram":
      return "fab fa-instagram";
    case "reddit":
      return "fab fa-reddit";
    case "discord":
      return "fab fa-discord";
    case "whatsapp":
      return "fab fa-whatsapp";
    case "facebook":
      return "fab fa-facebook";
    default:
      return "fa-solid fa-globe";
  }
}

// just for format values in a clock format
function formatTime(unit) {
  return unit < 10 ? "0" + unit : unit;
}

// send a message to check if can access the storage
chrome.runtime.sendMessage({ message: "check" }, async (response) => {
  if (response.verify) {
    chrome.storage.local.get("currentDomain", async (result) => {
      if (result.currentDomain) {
        await updatePopup(result.currentDomain);
      }
    })
  }
}); 
