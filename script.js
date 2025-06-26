document.getElementById("start-button").addEventListener("click", function () {
  document.getElementById("splash-screen").style.display = "none";
});

// Initialize the map
const map = new maplibregl.Map({
  container: "map",
  style: "style.json", // Replace this with the actual style URL
  center: [1.07, 21.8],
  zoom: 2,
});

// Function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Load the list of corrected country names from localStorage
const savedCountries =
  JSON.parse(localStorage.getItem("correctedCountries")) || [];

// Filter out the saved countries from the countryNames array before shuffling
let countryNames = countries.features.map((f) => f.properties.COUNTRY);

// Exclude the correct countries from the shuffled country names
countryNames = countryNames.filter((name) => !savedCountries.includes(name));

// Shuffle only the incorrect countries
shuffleArray(countryNames);

// Store the original country names before randomizing
countries.features.forEach((feature) => {
  feature.properties.originalCountry = feature.properties.COUNTRY; // Store the correct name
});

// Now, apply the shuffled names only to the incorrect countries
countries.features.forEach((feature) => {
  if (!savedCountries.includes(feature.properties.COUNTRY)) {
    const randomCountry = countryNames.shift();
    feature.properties.CORRECT_POSITION = false;
    feature.properties.COUNTRY = randomCountry;
  } else {
    feature.properties.CORRECT_POSITION = true;
  }
});

// Function to update the score display on the page
function updateScoreDisplay() {
  const score = parseInt(localStorage.getItem("score")) || 0;
  const scoreDisplay = document.getElementById("score-display");
  if (scoreDisplay) {
    scoreDisplay.textContent = `Score: ${score} / 249`;
  }
}

// Function to update the sidebar with correct and incorrect country names
function updateSidebar() {
  const correctCountryContainer = document.getElementById("correct-country-names");
  const incorrectCountryContainer = document.getElementById("incorrect-country-names");

  // Clear previous lists
  correctCountryContainer.innerHTML = "";
  incorrectCountryContainer.innerHTML = "";

  // Create lists
  const correctList = document.createElement("ul");
  const incorrectList = document.createElement("ul");

  // Populate correct country names
  savedCountries.forEach((countryName) => {
    const countryItem = document.createElement("li");
    countryItem.textContent = countryName;
    correctList.appendChild(countryItem);
  });

  // Get incorrect countries (not yet corrected)
  const incorrectCountries = countries.features
    .map(f => f.properties.originalCountry)
    .filter(name => !savedCountries.includes(name))
   .sort((a, b) => a.localeCompare(b)); // Sort alphabetically


  // Populate incorrect country names
  incorrectCountries.forEach((countryName) => {
    const countryItem = document.createElement("li");
    countryItem.textContent = countryName;
    incorrectList.appendChild(countryItem);
  });

  // Append lists
  correctCountryContainer.appendChild(correctList);
  incorrectCountryContainer.appendChild(incorrectList);
}

// Call updateScoreDisplay and updateSidebar on page load
updateScoreDisplay();
window.addEventListener("load", updateSidebar);

map.on("load", () => {
  // Add the countries source to the map
  map.addSource("countries", {
    type: "geojson",
    data: countries,
  });

  // Add country labels layer
  map.addLayer({
    id: "country-labels",
    type: "symbol",
    source: "countries",
    layout: {
      "text-field": ["get", "COUNTRY"],
      "text-font": ["Noto Sans Bold"],
      "text-max-width": 6.25,
      "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 4, 17],
    },
    paint: {
      "text-color": "#000",
      "text-halo-blur": 0.5,
      "text-halo-color": [
        "case",
        [
          "all",
          ["in", ["get", "COUNTRY"], ["literal", savedCountries]],
          ["get", "CORRECT_POSITION"],
        ],
        "#00FF00",
        "#fff",
      ],
      "text-halo-width": 1,
    },
  });

map.on("click", "country-labels", (e) => {
  const feature = e.features[0];
  const correctCountryName = feature.properties.originalCountry;

  // Remove existing input container
  const existingContainer = document.querySelector(".input-container");
  if (existingContainer) {
    existingContainer.remove();
  }

  // Create input box
  const container = document.createElement("div");
  container.classList.add("input-container");

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter country name";
  
  container.appendChild(input);
  document.getElementById("map").appendChild(container);

  // Automatically focus the input box
  input.focus();

  let score = parseInt(localStorage.getItem("score")) || 0;

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const userAnswer = input.value.trim();

      if (userAnswer.toLowerCase() === correctCountryName.toLowerCase()) {
        input.value = "Correct!";
        input.disabled = true;
        setTimeout(() => {
          document.getElementById("map").removeChild(container);
        }, 2000);

        feature.properties.COUNTRY = correctCountryName;
        feature.properties.CORRECT_POSITION = true;

        if (!savedCountries.includes(correctCountryName)) {
          savedCountries.push(correctCountryName);
          localStorage.setItem("correctedCountries", JSON.stringify(savedCountries));
        }

        score++;
        localStorage.setItem("score", score);
        updateScoreDisplay();

        const updatedCountries = { ...countries };
        updatedCountries.features = updatedCountries.features.map((f) => {
          if (f.properties.originalCountry === correctCountryName) {
            f.properties.COUNTRY = correctCountryName;
            f.properties.CORRECT_POSITION = true;
          }
          return f;
        });

        map.getSource("countries").setData(updatedCountries);

        map.setPaintProperty("country-labels", "text-halo-color", [
          "case",
          [
            "all",
            ["in", ["get", "COUNTRY"], ["literal", savedCountries]],
            ["get", "CORRECT_POSITION"],
          ],
          "#00FF00",
          "#fff",
        ]);

        updateSidebar();
      } else {
        input.value = "Incorrect!";
        input.disabled = true;
        setTimeout(() => {
          document.getElementById("map").removeChild(container);
        }, 2000);
      }
    }
  });
});
// Change cursor to pointer when hovering over country labels
map.on("mouseenter", "country-labels", () => {
  map.getCanvas().style.cursor = "pointer";
});

// Reset cursor when leaving country labels
map.on("mouseleave", "country-labels", () => {
  map.getCanvas().style.cursor = "";
});

});

// Get the clear storage button
const clearButton = document.getElementById("clear-storage");

// Add event listener to the button
clearButton.addEventListener("click", () => {
  const confirmation = window.confirm("Do you really want to clear your score and start again?");

  if (confirmation) {
    localStorage.removeItem("correctedCountries");
    localStorage.removeItem("score");

    countries.features.forEach((feature) => {
      feature.properties.CORRECT_POSITION = false;
    });

    updateScoreDisplay();
    location.reload();
  }
});

// Tab switching functionality
document.addEventListener("DOMContentLoaded", function () {
  const tabButtons = document.querySelectorAll(".tab-button");
  const contentSections = document.querySelectorAll("#correct-country-names, #incorrect-country-names");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      contentSections.forEach((section) => section.classList.add("hidden"));

      const targetId = this.getAttribute("data-target");
      document.getElementById(targetId).classList.remove("hidden");

      this.classList.add("active");
    });
  });
});
