// AngularJS Application Module for Madurai LocaleXplore
// 'ngAnimate' is added so ng-repeat / ng-if / ng-show / ng-hide / ng-class
// get automatic enter, leave, move, addClass & removeClass animation hooks
// (used by the swoosh + live-tracker animations below).
const app = angular.module('maduraiApp', ['ngAnimate']);

// ==========================================
// FACTORIES
// ==========================================

app.factory('TripPlannerFactory', function () {

    var trip = [];

    return {

        getTrip: function () {
            return trip;
        },

        addPlace: function (place) {

            if (!place) return;

            var exists = trip.some(function(item) {
                return item.id === place.id;
            });

            if (!exists) {
                var item = angular.copy(place);
                item.estimatedTime = '';
                trip.push(item);
            }

        },

        removePlace: function (index) {
            trip.splice(index, 1);
        },

        moveUp: function (index) {
            if (index > 0) {
                var temp = trip[index];
                trip[index] = trip[index - 1];
                trip[index - 1] = temp;
            }
        },

        moveDown: function (index) {
            if (index < trip.length - 1) {
                var temp = trip[index];
                trip[index] = trip[index + 1];
                trip[index + 1] = temp;
            }
        },

        clear: function () {
            trip.length = 0;
        }

    };

});

// ==========================================
// FAVOURITE PLACES FACTORY
// ==========================================

app.factory('FavouritePlacesFactory', function () {

    var favourites = [];

    return {

        getFavourites: function () {
            return favourites;
        },

        addFavourite: function (place) {

            if (!place) return;

            var exists = favourites.some(function (item) {
                return item.id === place.id;
            });

            if (!exists) {
                favourites.push(place);
            }

        },

        removeFavourite: function (index) {
            favourites.splice(index, 1);
        }

    };

});

// ==========================================
// RECENTLY VIEWED FACTORY
// ==========================================

app.factory('RecentlyViewedFactory', ['$http', function ($http) {

    var recentPlaces = [];

    return {

        getRecentPlaces: function () {
            return recentPlaces;
        },

        addPlace: function(place, userId) {

              if (!place) return;

              var index = recentPlaces.findIndex(function(p){
                  return p.id === place.id;
              });

              if(index !== -1){
                  recentPlaces.splice(index,1);
              }

              recentPlaces.unshift(place);

              if(recentPlaces.length > 5){
                  recentPlaces.pop();
              }
              
              // Sync to MongoDB
              var uid = userId || 'guest';
              $http.post('http://localhost:8000/api/mongo/viewed/', {
                  user_id: uid,
                  place_id: place.id,
                  place_name: place.name || place.title || place.id
              }).catch(function(e) { console.warn('MongoDB sync failed', e); });
          }

    };

}]);

// ==========================================
// DIRECTIVES
// ==========================================

app.directive('fallbackBg', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var url = attrs.fallbackBg;
            var type = attrs.fallbackType || 'place';
            var fallback = type === 'food' 
                ? 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80'
                : 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80';
            
            function setBg(src) {
                element.css({'background-image': 'url(' + src + ')'});
            }

            if (!url || url.trim() === '') {
                setBg(fallback);
                return;
            }

            var img = new Image();
            img.onload = function() {
                setBg(url);
            };
            img.onerror = function() {
                setBg(fallback);
            };
            img.src = url;
        }
    };
});

app.directive('favouriteCard', function () {

    return {

        restrict: 'E',

        scope: {
            place: '=',
            index: '=',
            onRemove: '&'
        },

        template: `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:14px;
                border:1px solid #ddd;
                border-radius:12px;
                margin-bottom:12px;">

                <div>
                    <h4>{{place.place_name || place.name}}</h4>
                    <small>Saved Favorite</small>
                </div>

                <button
                    class="btn"
                    ng-click="onRemove({index:index})">

                    ❌

                </button>

            </div>
        `
    };

});


// ==========================================
// CUSTOM DIRECTIVE 2: swoosh-reveal
// Attribute directive — makes any element/ng-repeat item "swoosh" into
// view (slide + fade) with a small stagger per index. Reusable anywhere.
// Usage: <div swoosh-reveal swoosh-index="$index"> ... </div>
// ==========================================
app.directive('swooshReveal', function ($timeout) {

    return {

        restrict: 'A',

        scope: {
            swooshIndex: '='
        },

        link: function (scope, element) {

            element.addClass('swoosh-init');

            var idx = scope.swooshIndex || 0;
            var delay = 60 * idx; // stagger each item slightly

            $timeout(function () {
                element.addClass('swoosh-play');
            }, delay);

        }

    };

});


// ==========================================
// CUSTOM DIRECTIVE 3: category-pill
// Element directive — encapsulates a single explore-page category filter
// button. Replaces the raw <button ng-repeat> markup and adds its own
// "swoosh pop" animation whenever it becomes the active pill.
// Usage: <category-pill cat="cat" active="activeCategory" on-select="setCategory(id)"></category-pill>
// ==========================================
app.directive('categoryPill', function () {

    return {

        restrict: 'E',

        scope: {
            cat: '=',
            active: '=',
            onSelect: '&'
        },

        template: `
            <button
                class="category-pill"
                ng-class="{active: active === cat.id, 'pill-pop': active === cat.id}"
                ng-click="onSelect({id: cat.id})">
                <span>{{ cat.icon }}</span> {{ cat.name }}
            </button>
        `

    };

});


// ==========================================
// CUSTOM DIRECTIVE 4: cost-breakdown-panel
// Element directive — collapsible itemised cost table for a confirmed
// trip. Uses ng-if internally so ngAnimate can slide/fade the panel open
// and closed instead of the instant ng-show toggle used before.
// Usage: <cost-breakdown-panel trip="trip"></cost-breakdown-panel>
// ==========================================
app.directive('costBreakdownPanel', function () {

    return {

        restrict: 'E',

        scope: {
            trip: '='
        },

        template: `
            <div>
                <button class="btn btn-outline"
                    ng-click="trip.showDetails = !trip.showDetails"
                    style="margin-bottom:10px;">
                    {{ trip.showDetails ? 'Hide Cost Breakdown \u25B2' : 'Show Cost Breakdown \u25BC' }}
                </button>
                <div class="cost-breakdown-table panel-slide-anim" ng-if="trip.showDetails">
                    <h5>Itemized Cost Estimation Breakdown:</h5>
                    <table>
                        <thead>
                            <tr>
                                <th>Stop / Activity</th>
                                <th>Estimated Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr ng-repeat="s in trip.stops">
                                <td>{{ s.time }} - {{ s.title }}</td>
                                <td>{{ s.estCost | currency:"\u20B9":0 }}</td>
                            </tr>
                            <tr class="total-row">
                                <td>Estimated Total Budget</td>
                                <td>{{ trip.totalFare | currency:"\u20B9":0 }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `

    };

});


// ==========================================
// CUSTOM DIRECTIVE 5: live-trip-tracker  (the "Live Travelling Tracker")
// Element directive — draws a mini progress track for a confirmed trip
// with a vehicle marker that glides (swooshes) from the origin stop to
// the destination stop on an infinite loop, plus a live ETA countdown
// so it reads as a "live travelling tracker" widget.
// Usage: <live-trip-tracker trip="trip"></live-trip-tracker>
// ==========================================
app.directive('liveTripTracker', function ($interval) {

    return {

        restrict: 'E',

        scope: {
            trip: '='
        },

        template: `
            <div class="live-tracker" aria-hidden="true">
                <div class="live-tracker-label">
                    <span class="live-dot-blink"></span>
                    Live Travelling Tracker
                    <span class="live-eta">ETA {{ etaRemaining }} min</span>
                </div>
                <div class="live-tracker-track">
                    <span class="live-tracker-start">{{ trip.stops[0].title }}</span>
                    <div class="live-tracker-line">
                        <div class="live-tracker-marker">{{ vehicleIcon }}</div>
                    </div>
                    <span class="live-tracker-end">{{ trip.stops[trip.stops.length - 1].title }}</span>
                </div>
            </div>
        `,

        link: function (scope) {

            scope.vehicleIcon = (scope.trip && /bus/i.test(scope.trip.mode)) ? '🚌' : '🛺';

            scope.etaRemaining = scope.trip ? scope.trip.durationMins : 0;

            // Purely cosmetic "live" countdown so the tracker feels active.
            var ticker = $interval(function () {
                if (scope.etaRemaining > 1) {
                    scope.etaRemaining -= 1;
                } else {
                    scope.etaRemaining = scope.trip.durationMins;
                }
            }, 4000);

            scope.$on('$destroy', function () {
                $interval.cancel(ticker);
            });

        }

    };

});


// ==========================================
// SERVICES
// ==========================================

// 1. Data Service: Fetches Madurai location & food datasets
app.service('DataService', function() {
  this.getCityInfo = function() {
    return window.MADURAI_DATA.city;
  };
  this.getCategories = function() {
    return window.MADURAI_DATA.categories;
  };
  this.getHubs = function() {
    return window.MADURAI_DATA.hubs;
  };
  this.getPlaces = function() {
    return window.MADURAI_DATA.places;
  };
  this.getFoods = function() {
    return window.MADURAI_DATA.foods;
  };
  this.getItineraries = function() {
    return window.MADURAI_DATA.itineraries;
  };
  this.getBusRoutes = function() {
    return window.MADURAI_DATA.busRoutes;
  };
  this.getCabOptions = function() {
    return window.MADURAI_DATA.cabOptions;
  };
});

// 2. Auth Service: Manages registration, logins, and session storage
app.service('AuthService', ['$rootScope', '$http', '$q', function($rootScope, $http, $q) {
  this.getCurrentUser = function() {
    return JSON.parse(localStorage.getItem('madurai_user')) || null;
  };

  this.setCurrentUser = function(user) {
    if (user) {
      localStorage.setItem('madurai_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('madurai_user');
    }
    $rootScope.$broadcast('auth-changed', user);
  };

  this.register = function(user) {
    return $http.post('http://127.0.0.1:8000/api/mongo/register/', user).then(response => {
      if (response.data.success) {
        this.setCurrentUser(response.data.user);
        return response.data.user;
      }
      return $q.reject(response.data.message);
    }).catch(err => {
      const msg = err.data && err.data.message ? err.data.message : 'Registration failed.';
      return $q.reject(msg);
    });
  };

  this.login = function(identity, password) {
    return $http.post('http://127.0.0.1:8000/api/mongo/login/', { identity: identity, password: password }).then(response => {
      if (response.data.success) {
        this.setCurrentUser(response.data.user);
        return response.data.user;
      }
      return $q.reject(response.data.message);
    }).catch(err => {
      const msg = err.data && err.data.message ? err.data.message : 'Login failed.';
      return $q.reject(msg);
    });
  };

  this.updateCurrentUser = function(userId, updatedData) {
    return $http.put('http://127.0.0.1:8000/api/mongo/user/' + userId + '/', updatedData).then(response => {
      if (response.data.success) {
        this.setCurrentUser(response.data.user);
        return response.data.user;
      }
      return $q.reject(response.data.message);
    }).catch(err => {
      const msg = err.data && err.data.message ? err.data.message : 'Update failed.';
      return $q.reject(msg);
    });
  };

  this.logout = function() {
    this.setCurrentUser(null);
  };
}]);

// 3. Transit Service: Performs distance math & fare recommendations
app.service('TransitService', ['DataService', function(DataService) {
  this.calculateDistance = function(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  // Calculate estimated travel time based on average city speed
    this.calculateTravelTime = function(distanceKm) {

        const averageSpeed = 25;   // km/hr inside Madurai city

        const timeMinutes = (distanceKm / averageSpeed) * 60;

        return Math.max(3, Math.round(timeMinutes));

    };

  this.findTransitOptions = function(origin, dest) {
    const distanceKm = this.calculateDistance(
        origin.coords.lat,
        origin.coords.lng,
        dest.coords.lat,
        dest.coords.lng
    );

    // Use the new service method
    const estimatedTime = this.calculateTravelTime(distanceKm);

    const busEstimateMin = estimatedTime + 5;
    const cabEstimateMin = Math.max(3, estimatedTime - 2);

    const buses = DataService.getBusRoutes().map(b => {
      return {
        ...b,
        calculatedFare: Math.min(30, Math.max(10, Math.round(distanceKm * 2.5 + 8))),
        estMinutes: busEstimateMin
      };
    });

    const cabs = DataService.getCabOptions().map(c => {
      return {
        ...c,
        totalFare: Math.round(c.baseFare + (distanceKm * c.perKm)),
        eta: cabEstimateMin
      };
    });

    return {
        distanceKm,
        estimatedTime,
        buses,
        cabs
    };
  };
}]);

// 4. Planner Service: Saves, confirms, and queries itineraries per user
app.service('PlannerService', ['$rootScope', '$http', function($rootScope, $http) {
  function getUserId(user) {
    const activeUser = user || JSON.parse(localStorage.getItem('madurai_user')) || null;
    if (activeUser && activeUser.id) return activeUser.id;
    if (activeUser && activeUser.email) return activeUser.email;
    if (activeUser && activeUser.phone) return activeUser.phone;
    return 'guest';
  }

  function getUserName(user) {
    const activeUser = user || JSON.parse(localStorage.getItem('madurai_user')) || null;
    if (activeUser && activeUser.username) return activeUser.username;
    return null;
  }

  this.getCreatedPlans = function(user) {
    const key = 'madurai_created_plans_' + getUserId(user);
    return JSON.parse(localStorage.getItem(key)) || [];
  };

  this.saveCreatedPlan = function(plan, user) {
    const key = 'madurai_created_plans_' + getUserId(user);
    const plans = this.getCreatedPlans(user);
    plans.unshift(plan);
    localStorage.setItem(key, JSON.stringify(plans));
    $rootScope.$broadcast('trips-updated');
    
    // MongoDB Sync
    var locations = [];
    if (plan.places && Array.isArray(plan.places)) {
        locations = plan.places.map(function(p) {
            return {
                place_id: p.id,
                place_name: p.name || p.title,
                estimated_time: p.estimatedTime || ''
            };
        });
    }
    $http.post('http://localhost:8000/api/mongo/trips/', {
        user_id: getUserId(user),
        username: getUserName(user),
        trip_name: plan.title || 'My Custom Trip',
        date: plan.date || new Date().toLocaleDateString(),
        locations: locations
    }).catch(function(e) { console.warn('MongoDB trip sync failed', e); });
  };

  this.deleteCreatedPlan = function(planId, user) {
    const key = 'madurai_created_plans_' + getUserId(user);
    let plans = this.getCreatedPlans(user);
    plans = plans.filter(p => p.id !== planId);
    localStorage.setItem(key, JSON.stringify(plans));
    $rootScope.$broadcast('trips-updated');
  };

  this.confirmCreatedPlan = function(planId, user) {
    const userId = getUserId(user);
    const plans = this.getCreatedPlans(user);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      plan.status = 'CONFIRMED';
      plan.confirmedAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      
      const confirmed = this.getConfirmedTrips(user);
      confirmed.unshift(plan);
      localStorage.setItem('madurai_confirmed_trips_' + userId, JSON.stringify(confirmed));

      this.deleteCreatedPlan(planId, user);
      $rootScope.$broadcast('trips-updated');
    }
  };

  this.getConfirmedTrips = function(user) {
    const key = 'madurai_confirmed_trips_' + getUserId(user);
    return JSON.parse(localStorage.getItem(key)) || [];
  };

  this.getActiveConfirmedTrips = function(user) {
    const trips = this.getConfirmedTrips(user);
    return trips.filter(t => t.status !== 'COMPLETED');
  };

  this.saveConfirmedTrip = function(trip, user) {
    const key = 'madurai_confirmed_trips_' + getUserId(user);
    const trips = this.getConfirmedTrips(user);
    trips.unshift(trip);
    localStorage.setItem(key, JSON.stringify(trips));
    $rootScope.$broadcast('trips-updated');
  };

  this.saveTrip = function(trip) {
    const user = JSON.parse(localStorage.getItem('madurai_user')) || null;
    this.saveConfirmedTrip(trip, user);
  };

  this.markTripCompleted = function(tripId, user) {
    if (!tripId) return;
    const userId = getUserId(user);
    const userName = getUserName(user);
    const key = 'madurai_confirmed_trips_' + userId;
    const trips = this.getConfirmedTrips(user);
    const trip = trips.find(t => String(t.id) === String(tripId));
    if (trip) {
      if (trip.status === 'COMPLETED') return; // Prevent duplicate save
      trip.status = 'COMPLETED';
      trip.completedAt = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      localStorage.setItem(key, JSON.stringify(trips));
      $rootScope.$broadcast('trips-updated');
      
      // Save to MongoDB Completed Trips
      const payload = {
          user_id: userId,
          username: userName || 'Guest Explorer',
          trip_name: trip.title || 'Completed Trip',
          places: trip.places || trip.stops || [],
          completed_date: trip.completedAt
      };
      
      $http.post('http://127.0.0.1:8000/api/mongo/completed-trips/', payload)
        .then(function(res) {
            console.log('MongoDB completed trip sync SUCCESS:', res.data);
        })
        .catch(function(e) {
            console.error('MongoDB completed trip sync FAILED.', 'Status:', e.status, 'Data:', e.data);
        });
    }
  };

  this.deleteConfirmedTrip = function(tripId, user) {
    if (!tripId) return;
    const userId = getUserId(user);
    const key = 'madurai_confirmed_trips_' + userId;
    let trips = this.getConfirmedTrips(user);
    trips = trips.filter(t => String(t.id) !== String(tripId));
    localStorage.setItem(key, JSON.stringify(trips));
    $rootScope.$broadcast('trips-updated');
  };

  this.getVisitedPlaces = function(user) {
    const trips = this.getConfirmedTrips(user);
    const completedTrips = trips.filter(t => t.status === 'COMPLETED');
    
    const visitedSet = new Set();
    const visitedList = [];

    completedTrips.forEach(trip => {
      if (trip.places && Array.isArray(trip.places)) {
        trip.places.forEach(p => {
          const name = typeof p === 'string' ? p : (p.name || p.title);
          if (name && name.trim()) {
            const cleanName = name.trim();
            const lowerKey = cleanName.toLowerCase();
            if (!visitedSet.has(lowerKey)) {
              visitedSet.add(lowerKey);
              visitedList.push(cleanName);
            }
          }
        });
      }
      if (trip.stops && Array.isArray(trip.stops)) {
        trip.stops.forEach(s => {
          const name = typeof s === 'string' ? s : (s.title || s.name);
          if (name && name.trim()) {
            const cleanName = name.trim();
            const lowerKey = cleanName.toLowerCase();
            if (!visitedSet.has(lowerKey)) {
              visitedSet.add(lowerKey);
              visitedList.push(cleanName);
            }
          }
        });
      }
    });

    return visitedList;
  };

  this.getReviewsForUser = function(user) {
    const userId = getUserId(user);
    const key = 'madurai_reviews_' + userId;
    return JSON.parse(localStorage.getItem(key)) || [];
  };

  this.saveUserReviews = function(reviewsArray, user) {
    if (!Array.isArray(reviewsArray) || reviewsArray.length === 0) return;
    const userId = getUserId(user);
    const key = 'madurai_reviews_' + userId;
    const existing = this.getReviewsForUser(user);
    const updated = [...reviewsArray, ...existing];
    localStorage.setItem(key, JSON.stringify(updated));
    $rootScope.$broadcast('reviews-updated');
  };

  this.getUserReviewMetrics = function(user) {
    const reviews = this.getReviewsForUser(user);
    const count = reviews.length;
    if (count === 0) {
      return { count: 0, averageRating: 0 };
    }
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = parseFloat((sum / count).toFixed(1));
    return { count, averageRating: avg };
  };
}]);


// ==========================================
// CONTROLLERS
// ==========================================
app.controller('MainController',[
'$scope',
'$http',
'DataService',
'AuthService',
'TransitService',
'PlannerService',
'TripPlannerFactory',
'FavouritePlacesFactory',
'RecentlyViewedFactory',
'$timeout',
'$interval',
function(
$scope,
$http,
DataService,
AuthService,
TransitService,
PlannerService,
TripPlannerFactory,
FavouritePlacesFactory,
RecentlyViewedFactory,
$timeout,
$interval
){

    

    // ng-click demonstration
    $scope.showWelcome = false;

    $scope.displayWelcome = function () {
        $scope.showWelcome = true;
    };

    $scope.searchPlaces = function () {

          $scope.showWelcome = false;

          // Convert search text to lowercase
          $scope.searchQuery = $scope.searchQuery.toLowerCase().trim();

    };
    // Core Application Variables
    $scope.currentTab = 'explore';
    $scope.activeCategory = 'all';
    $scope.searchQuery = '';
    // Two-way Data Binding Demo
    $scope.travellers = 1;
    $scope.currentUser = AuthService.getCurrentUser();

    // ------------------------------------------
    // CURRENT LOCATION & REAL WEATHER SYSTEM
    // ------------------------------------------
    $scope.showLocationBox = false;
    $scope.currentLocation = { name: 'Madurai, TN', lat: 9.9252, lng: 78.1198 };
    $scope.currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    $scope.currentWeather = null;
    $scope.weatherLoading = false;
    $scope.weatherError = null;

    // Live clock timer
    $interval(function() {
      $scope.currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }, 1000);

    $scope.toggleLocationBox = function() {
      $scope.showLocationBox = !$scope.showLocationBox;
      if ($scope.showLocationBox && !$scope.currentWeather) {
        $scope.fetchRealLocationAndWeather();
      }
    };

    function getWeatherDescription(code) {
      if (code === 0) return { description: "Clear Sky", icon: "☀️" };
      if (code >= 1 && code <= 3) return { description: "Partly Cloudy", icon: "⛅" };
      if (code === 45 || code === 48) return { description: "Foggy", icon: "🌫️" };
      if (code >= 51 && code <= 67) return { description: "Rain / Drizzle", icon: "🌧️" };
      if (code >= 80 && code <= 82) return { description: "Rain Showers", icon: "🌦️" };
      if (code >= 95) return { description: "Thunderstorm", icon: "🌩️" };
      return { description: "Clear", icon: "🌤️" };
    }

    $scope.fetchRealLocationAndWeather = function() {
      $scope.weatherLoading = true;
      $scope.weatherError = null;

      function fetchWeather(lat, lng) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
        $http.get(url).then(function(res) {
          $scope.weatherLoading = false;
          if (res.data && res.data.current_weather) {
            const cw = res.data.current_weather;
            const info = getWeatherDescription(cw.weathercode);
            $scope.currentWeather = {
              temp: cw.temperature,
              windspeed: cw.windspeed,
              description: info.description,
              icon: info.icon
            };
          }
        }).catch(function() {
          $scope.weatherLoading = false;
          $scope.weatherError = "Weather service unavailable";
        });
      }

      function reverseGeocode(lat, lng) {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        $http.get(geoUrl).then(function(res) {
          if (res.data && res.data.address) {
            const addr = res.data.address;
            const placeName = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.town || addr.county || 'Madurai';
            const stateName = addr.state || 'TN';
            $scope.currentLocation.name = `${placeName}, ${stateName}`;
          }
        }).catch(function() {
          $scope.currentLocation.name = 'Madurai, TN';
        });
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            $scope.currentLocation.lat = lat;
            $scope.currentLocation.lng = lng;
            fetchWeather(lat, lng);
            reverseGeocode(lat, lng);
          },
          function() {
            $scope.currentLocation.lat = 9.9252;
            $scope.currentLocation.lng = 78.1198;
            $scope.currentLocation.name = "Madurai, TN";
            fetchWeather(9.9252, 78.1198);
          },
          { timeout: 10000 }
        );
      } else {
        fetchWeather(9.9252, 78.1198);
      }
    };

    // Auto fetch location & weather on app load
    $scope.fetchRealLocationAndWeather();

    $scope.recentPlaces = RecentlyViewedFactory.getRecentPlaces(); 

    // ==========================================
    // CUSTOM TRIP PLANNER
    // ==========================================

    $scope.customTrip = TripPlannerFactory.getTrip();
    
    // Generate 30-min interval 12-hour times
    $scope.timeOptions = [];
    (function generateTimeOptions() {
      let times = [];
      let ampm = ['AM', 'PM'];
      for (let ap of ampm) {
        for (let h = 0; h < 12; h++) {
          let hour = (h === 0) ? 12 : h;
          // Format with leading zero for minutes if needed, but here it's 00 or 30
          times.push(`${hour}:00 ${ap}`);
          times.push(`${hour}:30 ${ap}`);
        }
      }
      $scope.timeOptions = times;
    })();

    const templeSchedules = {
      "meenakshi sundareswarar temple": [
        { start: "5:00 AM", end: "12:30 PM" },
        { start: "4:00 PM", end: "10:00 PM" }
      ],
      "koodal azhagar temple": [
        { start: "4:00 AM", end: "12:00 PM" },
        { start: "4:00 PM", end: "8:00 PM" }
      ],
      "vandiyur mariamman temple": [
        { start: "6:00 AM", end: "9:00 PM" }
      ],
      "azhagar kovil": [
        { start: "6:00 AM", end: "12:30 PM" },
        { start: "3:30 PM", end: "7:30 PM" }
      ],
      "thirupparankundram murugan temple": [
        { start: "5:30 AM", end: "1:00 PM" },
        { start: "4:00 PM", end: "9:00 PM" }
      ]
    };

    function parseTimeStr(timeStr) {
      if (!timeStr) return -1;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return -1;
      let h = parseInt(match[1]);
      let m = parseInt(match[2]);
      let ap = match[3].toUpperCase();
      if (h === 12) h = 0;
      if (ap === "PM") h += 12;
      return h * 60 + m;
    }

    $scope.validateTempleTiming = function(place) {
      place.timingWarning = false;
      if (!place.estimatedTime) return;
      if (!place.name) return;
      
      const normalizedName = place.name.toLowerCase().trim();
      let schedule = null;
      
      for (let temple in templeSchedules) {
        if (normalizedName.includes(temple)) {
          schedule = templeSchedules[temple];
          break;
        }
      }
      
      if (!schedule) return; // Not a configured temple
      
      const selectedMins = parseTimeStr(place.estimatedTime);
      if (selectedMins === -1) return;
      
      let isOpen = false;
      for (let window of schedule) {
        let startMins = parseTimeStr(window.start);
        let endMins = parseTimeStr(window.end);
        if (selectedMins >= startMins && selectedMins <= endMins) {
          isOpen = true;
          break;
        }
      }
      
      place.timingWarning = !isOpen;
    };

    // Favourite Places Factory - REPLACED BY EXPRESS MONGODB API
    $scope.favourites = [];

    $scope.fetchFavorites = function() {
        const user = $scope.currentUser || JSON.parse(localStorage.getItem('madurai_user')) || null;
        if (!user) {
            $scope.favourites = [];
            return;
        }
        const userId = user.id || user.email || user.phone || 'guest';
        
        $http.get(`http://localhost:8000/api/mongo/favorites/${encodeURIComponent(userId)}`)
            .then(function(res) {
                if (res.data && res.data.success) {
                    $scope.favourites = res.data.favorites;
                    console.log("Favorites successfully synced with Express MongoDB API.");
                }
            })
            .catch(function(err) {
                console.error("Failed to fetch favorites from Express API:", err);
            });
    };

    // Load favorites on startup
    $scope.fetchFavorites();

    $scope.isFavourite = function (place) {
        if (!place) return false;
        return $scope.favourites.some(function (item) {
            return item.place_id === place.id;
        });
    };

    $scope.addFavourite = function(place){
        if (!place) return;
        const user = $scope.currentUser || JSON.parse(localStorage.getItem('madurai_user')) || null;
        if (!user) {
            $scope.showToast("⚠️ Please log in to add favorites.");
            return;
        }

        if ($scope.isFavourite(place)) {
            $scope.removeFavourite(place);
            return;
        }

        const userId = user.id || user.email || user.phone || 'guest';
        const userName = user.username || user.name || 'Guest Explorer';

        const payload = {
            user_id: userId,
            username: userName,
            place_id: place.id,
            place_name: place.name || place.title || 'Unknown Place'
        };

        $http.post('http://localhost:8000/api/mongo/favorites', payload)
            .then(function(res) {
                if (res.data && res.data.success) {
                    $scope.showToast("❤️ Added to favorites in MongoDB!");
                    $scope.fetchFavorites(); // Reload true state from server
                }
            })
            .catch(function(err) {
                if (err.status === 409) {
                    $scope.showToast("⚠️ Place already favorited!");
                } else {
                    console.error("Failed to add favorite via Express:", err);
                    $scope.showToast("❌ Failed to add favorite. Express API error.");
                }
            });
    };

    $scope.removeFavourite = function(indexOrPlace) {
        // Handle both index-based (from UI list) and place-based (from heart button)
        let placeIdToRemove = null;
        if (typeof indexOrPlace === 'number' || typeof indexOrPlace === 'string' && !isNaN(indexOrPlace)) {
            const fav = $scope.favourites[indexOrPlace];
            if (fav) placeIdToRemove = fav.place_id;
        } else if (indexOrPlace && indexOrPlace.id) {
            placeIdToRemove = indexOrPlace.id;
        } else if (indexOrPlace && indexOrPlace.place_id) {
            placeIdToRemove = indexOrPlace.place_id;
        }

        if (!placeIdToRemove) return;

        const user = $scope.currentUser || JSON.parse(localStorage.getItem('madurai_user')) || null;
        if (!user) return;
        
        const userId = user.id || user.email || user.phone || 'guest';

        $http.delete(`http://localhost:8000/api/mongo/favorites/${encodeURIComponent(userId)}/${encodeURIComponent(placeIdToRemove)}`)
            .then(function(res) {
                if (res.data && res.data.success) {
                    $scope.fetchFavorites(); // Reload true state from server
                    $scope.showToast("💔 Removed from favorites.");
                }
            })
            .catch(function(err) {
                console.error("Failed to remove favorite via Express:", err);
                $scope.showToast("❌ Failed to remove favorite. Express API error.");
            });
    };
    
    $scope.tripSearch = "";
    $scope.selectedPlace = null;


    // Data Load - Default to Local Data (Fallback)
    $scope.dataSource = "Local data";

    $scope.city = DataService.getCityInfo();
    $scope.categories = DataService.getCategories();
    $scope.places = DataService.getPlaces();
    $scope.foods = DataService.getFoods();
    $scope.itineraries = DataService.getItineraries();
    $scope.busRoutes = DataService.getBusRoutes();
    $scope.cabOptions = DataService.getCabOptions();

    /**
     * Connects AngularJS to the Node.js Express backend API.
     * Attempts to fetch places from http://localhost:8000/api/places using $http.
     * On Success: Updates $scope.places with backend data and sets dataSource indicator to "Node.js API".
     * On Error/Offline: Retains DataService local data as fallback and sets dataSource to "Local data".
     */
    $scope.loadPlacesFromServer = function() {
        $http.get('http://localhost:8000/api/places')
            .then(function(response) {
                if (response.data && response.data.success && response.data.places) {
                    $scope.places = response.data.places;
                    $scope.applyLocalImages($scope.places);
                    $scope.dataSource = "Node.js API";
                    console.log("Successfully loaded places from Node.js backend API!");
                }
            })
            .catch(function(error) {
                console.warn("Node.js API server unavailable. Operating on local DataService fallback.", error);
                $scope.dataSource = "Local data";
            });
    };

    /**
     * Connects AngularJS to the Django backend API for Tourist Places.
     * Attempts to fetch places from http://localhost:8000/api/places/ using $http.
     * On Success: Updates $scope.places with Django backend data and sets dataSource to "Django API".
     * On Error/Offline: Falls back to Node.js server API / local data.
     */
    $scope.applyLocalImages = function(placesArray) {
        if (!Array.isArray(placesArray)) return;
        const localImageMap = {
            "Meenakshi Sundareswarar Temple": "images/places/meenakshi_sundareswarar_temple.jpg",
            "Thirumalai Nayakkar Mahal": "images/places/thirumalai_nayakkar_mahal.jpg",
            "Vandiyur Mariamman Teppakulam": "images/places/vandiyur_mariamman_teppakulam.jpg",
            "Koodal Azhagar Temple": "images/places/koodal_azhagar_temple.jpg",
            "Gandhi Memorial Museum": "images/places/gandhi_memorial_museum.jpg",
            "Alagar Kovil (Kallazhagar Temple)": "images/places/alagar_kovil.jpg",
            "Samanar Hills (Keelakuyilkudi)": "images/places/samanar_hills.jpg",
            "Thiruparankundram Murugan Temple": "images/places/thiruparankundram_murugan_temple.jpg",
            "Vilacheri Pottery & Artisans Village": "images/places/vilacheri_pottery.jpg",
            "Puthu Mandapam Crafts & Tailors Market": "images/places/puthu_mandapam.jpg",
            "Goripalayam Dargah": "images/places/goripalayam_dargah.jpg",
            "St. Mary's Cathedral": "images/places/st_marys_cathedral.jpg",
            "Yanaimalai (Elephant Hill) & Narasimha Temple": "images/places/yanaimalai_narasimha_temple.jpg"
        };
        placesArray.forEach(function(place) {
            if (localImageMap[place.name]) {
                place.image = localImageMap[place.name];
            }
        });
    };

    $scope.loadPlacesFromDjango = function() {
        $http.get('http://localhost:8000/api/places/')
            .then(function(response) {
                if (response.data && response.data.places) {
                    $scope.places = response.data.places;
                    $scope.applyLocalImages($scope.places);
                    $scope.dataSource = "Django API";
                    console.log("Successfully loaded places from Django backend API!");
                } else if (Array.isArray(response.data)) {
                    $scope.places = response.data;
                    $scope.applyLocalImages($scope.places);
                    $scope.dataSource = "Django API";
                    console.log("Successfully loaded places array from Django backend API!");
                }
            })
            .catch(function(error) {
                console.warn("Django API server unavailable. Trying Node.js backend fallback...", error);
                $scope.loadPlacesFromServer();
            });
    };

    // Load data from Django API first, with fallback to Node.js API & local data
    $scope.loadPlacesFromDjango();

    // Get place name from selected ID
      $scope.getPointName = function(id) {
          if (!id) return "";

          for (let i = 0; i < $scope.transitPoints.length; i++) {
              if ($scope.transitPoints[i].id === id) {
                  return $scope.transitPoints[i].name;
              }
          }

          return "";
      };
    // Confirmed Trips list (active confirmed trips)
    $scope.confirmedTrips = PlannerService.getActiveConfirmedTrips($scope.currentUser);
    $scope.createdPlans = PlannerService.getCreatedPlans($scope.currentUser);
    $scope.visitedPlaces = PlannerService.getVisitedPlaces($scope.currentUser);

    $scope.refreshUserTrips = function() {
      $scope.createdPlans = PlannerService.getCreatedPlans($scope.currentUser);
      $scope.confirmedTrips = PlannerService.getActiveConfirmedTrips($scope.currentUser);
      $scope.visitedPlaces = PlannerService.getVisitedPlaces($scope.currentUser);
    };

    $scope.refreshUserTrips();

    // Auto recover pending trip after logging in
    const pendingTrip = sessionStorage.getItem('pending_trip');
    if (pendingTrip && $scope.currentUser) {
      sessionStorage.removeItem('pending_trip');
      $timeout(function() {
        $scope.activeBooking = JSON.parse(pendingTrip);
        $scope.showConfirmModal = true;
      }, 500);
    }

    // Map instances
    let map = null;
    let mapMarkers = [];
    let routePolyline = null;

    // View Switching
    $scope.switchTab = function(tabName) {
      $scope.currentTab = tabName;
      if (tabName === 'confirmed') {
        $timeout(function() {
          initializeMap();
          if ($scope.confirmedTrips.length > 0) {
            $scope.plotTripRoute($scope.confirmedTrips[0]);
          }
        }, 100);
      }
      if (tabName === 'profile') {
        $scope.refreshUserTrips();
        $scope.refreshUserReviews();
        $scope.loadUserStatistics();
      }
    };

    // Category pill selection
    $scope.setCategory = function(catId) {
      $scope.activeCategory = catId;
    };

    // Custom filtering functions for search bar & categories
    $scope.filterPlaces = function(place) {

          var query = ($scope.searchQuery || '').toLowerCase().trim();

          var queryMatch =
              !query ||
              (place.name && place.name.toLowerCase().includes(query)) ||
              (place.description && place.description.toLowerCase().includes(query)) ||
              (place.address && place.address.toLowerCase().includes(query)) ||
              (place.tags && place.tags.some(function(t) {
                  return t.toLowerCase().includes(query);
              }));

          if ($scope.activeCategory === 'all') {
              return queryMatch;
          }

          if ($scope.activeCategory === 'popular') {
              return place.isPopular && queryMatch;
          }

          if ($scope.activeCategory === 'food') {
              return false;
          }

          return place.category === $scope.activeCategory && queryMatch;
      };

    $scope.filterFoods = function(food) {
      const queryMatch = !$scope.searchQuery || 
        food.name.toLowerCase().includes($scope.searchQuery) ||
        food.description.toLowerCase().includes($scope.searchQuery) ||
        food.spotName.toLowerCase().includes($scope.searchQuery) ||
        food.mustTry.toLowerCase().includes($scope.searchQuery);

      if ($scope.activeCategory === 'all') return queryMatch;
      if ($scope.activeCategory === 'popular') return food.isPopular && queryMatch;
      if ($scope.activeCategory === 'food') return queryMatch;
      return false; // Hide foods in place specific tabs
    };

    // Helper method to resolve current user identifier
    // Ensure proper user identification
    $scope.loadUserStatistics = function() {
      const userId = $scope.getUserIdentifier ? $scope.getUserIdentifier() : null;
      console.log("Statistics user ID:", userId);
      
      if (!userId || userId === 'guest') {
         console.log("Skipping statistics load for guest or invalid user.");
         return;
      }

      $http.get('http://localhost:8000/api/mongo/statistics/' + userId + '/')
        .then(function(res) {
           console.log("Statistics API response:", res.data);
           
           if(res.data.success) {
               // Handle both nested and flat responses
               $scope.userStatistics = res.data.statistics || res.data;
           } else {
               $scope.userStatistics = res.data.statistics || res.data; // Fallback
           }
           console.log("Statistics object:", $scope.userStatistics);
        })
        .catch(function(e) {
           console.error('Failed to fetch user statistics', e);
        });
    };

    $scope.getUserIdentifier = function(user) {
      const u = user || $scope.currentUser || AuthService.getCurrentUser();
      if (u && u._id) return u._id;
      if (u && u.id) return u.id;
      if (u && u.email) return u.email;
      if (u && u.phone) return u.phone;
      return 'guest';
    };

    // Listening to Auth updates
    $scope.$on('auth-changed', function(event, user) {
      $scope.currentUser = user;
      $scope.refreshUserTrips();
      $scope.refreshUserReviews();
      $scope.loadUserStatistics();
    });

    // Listening to Saved Trips updates
    $scope.$on('trips-updated', function() {
      $scope.refreshUserTrips();
    });


    // ------------------------------------------
    // DETAIL MODAL LOGIC
    // ------------------------------------------
    $scope.selectedSpot = null;
    $scope.showDetailModal = false;

    $scope.openSpotDetail = function(spot, type) {

        console.log("Clicked:", spot.name);

        $scope.selectedSpot = spot;

        var uid = $scope.getUserIdentifier ? $scope.getUserIdentifier() : 'guest';
        RecentlyViewedFactory.addPlace(spot, uid);

        console.log("Recent:", RecentlyViewedFactory.getRecentPlaces());

        $scope.selectedSpot.type = type;

        $scope.showDetailModal = true;
    };

    $scope.closeSpotDetail = function() {
      $scope.showDetailModal = false;
      $scope.selectedSpot = null;
    };

    $scope.routeToDetailSpot = function(spot) {
      $scope.showDetailModal = false;
      $scope.quickBookRouteTo(spot.id);
    };

    // ------------------------------------------
    // AUTH MODAL LOGIC
    // ------------------------------------------
    $scope.showAuthModal = false;
    $scope.authMode = 'login'; // login or register
    $scope.authError = '';

    $scope.regForm = {};
    $scope.loginForm = {};

    $scope.openAuth = function(mode = 'login') {
      $scope.authMode = mode;
      $scope.authError = '';
      $scope.showAuthModal = true;
    };

    $scope.closeAuth = function() {
      $scope.showAuthModal = false;
    };

    $scope.setAuthMode = function(mode) {
      $scope.authMode = mode;
      $scope.authError = '';
    };

    $scope.checkPasswordStrength = function(password) {
      if (!password) return { label: 'Empty', class: 'text-muted', level: 0 };
      let score = 0;
      if (password.length >= 6) score++;
      if (password.length >= 8) score++;
      if (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) score++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

      if (score <= 1) {
        return { label: 'Weak (Unsecure)', class: 'text-danger', level: 1 };
      } else if (score <= 3) {
        return { label: 'Medium', class: 'text-warning', level: 2 };
      } else {
        return { label: 'Strong', class: 'text-success', level: 3 };
      }
    };

    $scope.submitRegister = function() {
      if (!$scope.regForm.username || !$scope.regForm.name || !$scope.regForm.phone || !$scope.regForm.email || !$scope.regForm.password) {
        $scope.authError = 'Please fill in all register fields.';
        return;
      }
      if ($scope.regForm.phone.length < 10) {
        $scope.authError = 'Please enter a valid 10-digit mobile number.';
        return;
      }

      // Check password strength and prompt warning if weak
      const strength = $scope.checkPasswordStrength($scope.regForm.password);
      if (strength.level === 1) {
        alert("⚠️ Security Alert: Your password is too weak!\n\nPlease use a stronger password (minimum 6 characters, combining letters, numbers, and special symbols like @, #, $) to secure your trip planner account.");
        return;
      }

      const newUser = {
        username: $scope.regForm.username,
        name: $scope.regForm.name,
        phone: $scope.regForm.phone,
        email: $scope.regForm.email,
        password: $scope.regForm.password
      };

      AuthService.register(newUser).then(function(user) {
        $scope.currentUser = user;
        $scope.showToast(`Welcome to Madurai, ${user.name}!`);
        $scope.closeAuth();
        $scope.regForm = {};
        $scope.refreshUserTrips();
        $scope.refreshUserReviews();
        $scope.fetchFavorites();
      }).catch(function(err) {
        $scope.authError = err;
      });
    };

    $scope.submitLogin = function() {
      if (!$scope.loginForm.identity || !$scope.loginForm.password) {
        $scope.authError = 'Please enter Username/Email/Phone and Password.';
        return;
      }

      AuthService.login($scope.loginForm.identity, $scope.loginForm.password).then(function(user) {
        $scope.currentUser = user;
        $scope.showToast(`Welcome back, ${user.name}!`);
        $scope.closeAuth();
        $scope.loginForm = {};
        $scope.refreshUserTrips();
        $scope.refreshUserReviews();
        $scope.fetchFavorites();
      }).catch(function(err) {
        $scope.authError = err;
      });
    };

    $scope.logout = function() {
      AuthService.logout();
      $scope.currentUser = null;
      $scope.showToast('Logged out successfully.');
      $scope.refreshUserTrips();
      $scope.refreshUserReviews();
      $scope.fetchFavorites();
      
      // Close profile modal/tab and redirect to login modal
      if (typeof $scope.closeProfileModal === 'function') {
        $scope.closeProfileModal();
      }
      $scope.currentTab = 'explore';
      $scope.openAuth('login');
    };

    // ------------------------------------------
    // TRANSIT ROUTE FINDER LOGIC
    // ------------------------------------------
    $scope.transitOrigin = 'hub_periyar';
    $scope.transitDest = 'place_meenakshi';
    $scope.transitResults = null;

    $scope.findTransitPointsList = function() {
      return [
        ...DataService.getHubs().map(h => ({ id: h.id, name: h.name, type: 'Hub', coords: { lat: h.lat, lng: h.lng } })),
        ...DataService.getPlaces().map(p => ({ id: p.id, name: p.name, type: 'Landmark', coords: p.coordinates })),
        ...DataService.getFoods().map(f => ({ id: f.id, name: `${f.name} (${f.spotName})`, type: 'Food Spot', coords: f.coordinates }))
      ];
    };

    $scope.transitPoints = $scope.findTransitPointsList();

    $scope.searchTransit = function() {
      if (!$scope.transitOrigin || !$scope.transitDest) return;
      if ($scope.transitOrigin === $scope.transitDest) {
        alert('Origin and Destination cannot be identical.');
        return;
      }

      const originPt = $scope.transitPoints.find(p => p.id === $scope.transitOrigin);
      const destPt = $scope.transitPoints.find(p => p.id === $scope.transitDest);

      const results = TransitService.findTransitOptions(originPt, destPt);
      
      $scope.transitResults = {
          origin: originPt,
          destination: destPt,
          distanceKm: results.distanceKm,
          estimatedTime: results.estimatedTime,
          buses: results.buses,
          cabs: results.cabs
      };
    };

    $scope.swapTransit = function() {
      const temp = $scope.transitOrigin;
      $scope.transitOrigin = $scope.transitDest;
      $scope.transitDest = temp;
      $scope.searchTransit();
    };

    $scope.quickBookRouteTo = function(destId) {
      $scope.transitDest = destId;
      $scope.switchTab('transit');
      $scope.searchTransit();
    };

    // ------------------------------------------
    // CONFIRMATION & PLANNER LOGIC
    // ------------------------------------------
    $scope.showConfirmModal = false;
    $scope.activeBooking = null;
    $scope.payModeSelection = 'Cash on Hand / Local Stalls';

    $scope.selectBusRoute = function(bus, origin, dest) {
      const trip = {
        id: 'trip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        title: `Bus #${bus.routeNo} Trip: ${origin.name} to ${dest.name}`,
        mode: 'Local Town Bus',
        vehicleName: `Town Bus #${bus.routeNo}`,
        distanceKm: $scope.transitResults.distanceKm,
        totalFare: bus.calculatedFare,
        durationMins: bus.estMinutes,
        stops: [
          { time: 'Departure', title: origin.name, locationId: origin.id, coords: origin.coords, estCost: bus.calculatedFare },
          { time: 'Arrival', title: dest.name, locationId: dest.id, coords: dest.coords, estCost: 0 }
        ]
      };
      $scope.initiateTripSave(trip);
    };

    $scope.selectCabOption = function(cab, origin, dest) {
      const trip = {
        id: 'trip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        title: `${cab.name} Booking: ${origin.name} to ${dest.name}`,
        mode: 'Cab / Auto',
        vehicleName: cab.name,
        distanceKm: $scope.transitResults.distanceKm,
        totalFare: cab.totalFare,
        durationMins: cab.eta,
        stops: [
          { time: 'Pickup', title: origin.name, locationId: origin.id, coords: origin.coords, estCost: cab.totalFare },
          { time: 'Dropoff', title: dest.name, locationId: dest.id, coords: dest.coords, estCost: 0 }
        ]
      };
      $scope.initiateTripSave(trip);
    };

    $scope.adoptItinerary = function(itinerary) {
      const trip = {
        id: 'trip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        title: itinerary.title,
        mode: itinerary.transitMode,
        vehicleName: itinerary.transitMode,
        distanceKm: 18.5,
        totalFare: itinerary.estimatedCost,
        durationMins: 480,
        stops: itinerary.stops.map(s => {
          let place = DataService.getPlaces().find(p => p.id === s.locationId) || DataService.getFoods().find(f => f.id === s.locationId);
          return {
            time: s.time,
            title: s.title,
            locationId: s.locationId,
            coords: place ? place.coordinates : { lat: 9.9195, lng: 78.1193 },
            estCost: s.estCost
          };
        })
      };
      $scope.initiateTripSave(trip);
    };

    $scope.initiateTripSave = function(trip) {
      if (!$scope.currentUser) {
        // Save pending trip in sessionStorage so they don't lose it on login redirect
        sessionStorage.setItem('pending_trip', JSON.stringify(trip));
        window.location.href = 'login.html';
        return;
      }
      $scope.activeBooking = trip;
      $scope.showConfirmModal = true;
    };

    $scope.closeConfirmation = function() {
      $scope.showConfirmModal = false;
      $scope.activeBooking = null;
    };

    $scope.saveConfirmedTrip = function() {
      if (!$scope.activeBooking) return;

      const confirmedTrip = {
        ...$scope.activeBooking,
        id: ($scope.activeBooking && $scope.activeBooking.id) ? $scope.activeBooking.id : ('trip_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        bookingRef: 'MDU-' + Math.floor(100000 + Math.random() * 900000),
        status: 'CONFIRMED',
        suggestedPayMode: $scope.payModeSelection,
        bookedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        userName: $scope.currentUser ? $scope.currentUser.name : 'Explorer',
        userPhone: $scope.currentUser ? $scope.currentUser.phone : 'N/A'
      };

      PlannerService.saveTrip(confirmedTrip);
      $scope.showToast(`🎯 Trip Confirmed & Saved! Ref: ${confirmedTrip.bookingRef}`);
      $scope.closeConfirmation();
      $scope.switchTab('confirmed');
    };

    // ------------------------------------------
    // CUSTOM TRIP PLANNER & CREATED PLANS
    // ------------------------------------------

    // User selects a place from suggestions
    $scope.selectPlace = function(place) {
        $scope.selectedPlace = place;
        $scope.tripSearch = "";
    };

    // Add selected place into trip
    $scope.addPlaceToTrip = function() {
        if (!$scope.selectedPlace) {
            alert("Please select a place.");
            return;
        }

        TripPlannerFactory.addPlace($scope.selectedPlace);
        $scope.selectedPlace = null;
    };

    // Remove place
    $scope.removePlace = function(index) {
        TripPlannerFactory.removePlace(index);
    };

    // Move Up
    $scope.movePlaceUp = function(index) {
        TripPlannerFactory.moveUp(index);
    };

    // Move Down
    $scope.movePlaceDown = function(index) {
        TripPlannerFactory.moveDown(index);
    };

    // Date formatting helper
    $scope.getFormattedDate = function(dateObj = new Date()) {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    };

    // Auto default name generator: e.g. "13 July 2026 - 1", "13 July 2026 - 2"
    $scope.generateDefaultPlanName = function() {
      const dateStr = $scope.getFormattedDate();
      const createdPlans = PlannerService.getCreatedPlans($scope.currentUser);
      const confirmedTrips = PlannerService.getConfirmedTrips($scope.currentUser);
      
      let sameDateCount = 0;
      [...createdPlans, ...confirmedTrips].forEach(p => {
        if (p.createdDate === dateStr || (p.title && p.title.startsWith(dateStr))) {
          sameDateCount++;
        }
      });
      
      return `${dateStr} - ${sameDateCount + 1}`;
    };

    // Save/Create Plan
    $scope.newPlanTitle = '';
    $scope.createPlan = function() {
        if ($scope.customTrip.length === 0) {
            alert("Please search and add at least one place to your trip itinerary.");
            return;
        }

        const planTitle = ($scope.newPlanTitle && $scope.newPlanTitle.trim()) ? 
                          $scope.newPlanTitle.trim() : 
                          $scope.generateDefaultPlanName();

        const formattedDate = $scope.getFormattedDate();

        const newPlan = {
          id: 'plan_' + Date.now(),
          userId: $scope.currentUser ? $scope.currentUser.id : 'guest',
          userName: $scope.currentUser ? $scope.currentUser.name : 'Guest Explorer',
          userPhone: $scope.currentUser ? $scope.currentUser.phone : 'N/A',
          title: planTitle,
          createdDate: formattedDate,
          places: angular.copy($scope.customTrip).map(p => ({
            id: p.id,
            name: p.name,
            estimatedTime: p.estimatedTime || 'Not specified',
            image: p.image,
            categoryLabel: p.categoryLabel || p.category || 'Spot',
            coordinates: p.coordinates
          })),
          status: 'CREATED'
        };

        PlannerService.saveCreatedPlan(newPlan, $scope.currentUser);
        $scope.showToast(`🎉 Plan "${planTitle}" created successfully!`);
        
        // Clear creation form & draft
        $scope.newPlanTitle = '';
        TripPlannerFactory.clear();
        $scope.refreshUserTrips();
    };

    // Confirm Plan (move from pending created plans to confirmed trips)
    $scope.confirmCreatedPlan = function(plan) {
      PlannerService.confirmCreatedPlan(plan.id, $scope.currentUser);
      $scope.showToast(`🎯 Plan "${plan.title}" confirmed! Added to My Confirmed Trips.`);
      $scope.refreshUserTrips();
    };

    // Delete Pending Created Plan
    $scope.deleteCreatedPlan = function(plan) {
      if (confirm(`Are you sure you want to delete the plan "${plan.title}"?`)) {
        PlannerService.deleteCreatedPlan(plan.id, $scope.currentUser);
        $scope.showToast(`🗑️ Plan deleted.`);
        $scope.refreshUserTrips();
      }
    };

    // ------------------------------------------
    // TRIP COMPLETION REVIEW WORKFLOW
    // ------------------------------------------
    $scope.showReviewModal = false;
    $scope.tripToComplete = null;
    $scope.pendingReviews = [];

    // Mark Confirmed Trip as Completed (Triggers Review Modal & MongoDB Save immediately)
    $scope.markTripCompleted = function(trip) {
      if (!trip) return;
      
      // 1. Immediately record in MongoDB & update local status
      PlannerService.markTripCompleted(trip.id, $scope.currentUser);
      
      // 2. Setup Review Modal
      $scope.tripToComplete = trip;
      const locations = [];

      if (trip.places && Array.isArray(trip.places) && trip.places.length > 0) {
        trip.places.forEach(p => {
          locations.push({
            id: p.id || p.place_id || p.locationId || ('loc_' + Math.random()),
            name: p.name || p.title || 'Spot',
            rating: 5,
            comment: ''
          });
        });
      } else if (trip.stops && Array.isArray(trip.stops) && trip.stops.length > 0) {
        trip.stops.forEach(s => {
          locations.push({
            id: s.locationId || s.id || s.place_id || ('stop_' + Math.random()),
            name: s.title || s.name || 'Spot',
            rating: 5,
            comment: ''
          });
        });
      }

      if (locations.length === 0) {
        locations.push({ id: 'loc_main', name: trip.title || 'Trip Spot', rating: 5, comment: '' });
      }

      $scope.pendingReviews = locations;
      $scope.showReviewModal = true;
    };

    $scope.setStarRating = function(reviewItem, rating) {
      reviewItem.rating = rating;
    };

    $scope.closeReviewModal = function() {
      $scope.showReviewModal = false;
      $scope.tripToComplete = null;
      $scope.pendingReviews = [];
    };

    $scope.submitTripReviews = function() {
      console.log("--- submitTripReviews() EXECUTED ---");
      if (!$scope.tripToComplete) return;

      const user = $scope.currentUser;
      const userId = $scope.getUserIdentifier(user);

      const activeUser = user || JSON.parse(localStorage.getItem('madurai_user')) || null;
      const userName = (activeUser && activeUser.username) ? activeUser.username : 'Guest Explorer';
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      const payload = $scope.pendingReviews.map(r => ({
        user_id: userId,
        username: userName,
        place_id: r.id || 'place_spot',
        place_name: r.name || 'Spot',
        rating: Math.min(5, Math.max(1, parseInt(r.rating) || 5)),
        review: r.comment ? r.comment.trim() : 'Great experience visiting here!',
        date: today
      }));

      const url = 'http://127.0.0.1:8000/api/mongo/reviews/';
      console.log("SENDING POST REQUEST TO:", url);
      console.log("PAYLOAD:", payload);

      // Send reviews to Django MongoDB Backend API
      $http.post(url, payload)
        .then(function(res) {
          console.log("SUCCESS! HTTP Status:", res.status, "Response Data:", res.data);
          PlannerService.saveUserReviews(payload, user);

          $scope.showToast(`🎉 Reviews saved to Django!`);
          $scope.closeReviewModal();
          $scope.refreshUserTrips();
          $scope.refreshUserReviews();
        })
        .catch(function(err) {
          console.error("FAILURE! HTTP Status:", err.status, "Error Data:", err.data);
          $scope.showToast(`❌ Failed to save reviews to MongoDB! Check console.`);
        });
    };

    $scope.refreshUserReviews = function() {
      const userId = $scope.getUserIdentifier();

      $http.get('http://localhost:8000/api/mongo/reviews/user/' + encodeURIComponent(userId) + '/')
        .then(function(res) {
          if (res.data && res.data.success) {
            $scope.userReviews = res.data.reviews || [];
            $scope.userReviewMetrics = {
              count: res.data.count || 0,
              averageRating: res.data.average_rating || 0
            };
            console.log("Loaded user reviews from Django API:", res.data);
          }
        })
        .catch(function(err) {
          console.warn("Django API unavailable, using local review fallback:", err);
          $scope.userReviews = PlannerService.getReviewsForUser($scope.currentUser);
          $scope.userReviewMetrics = PlannerService.getUserReviewMetrics($scope.currentUser);
        });
    };

    $scope.refreshUserReviews();

    $scope.$on('reviews-updated', function() {
      $scope.refreshUserReviews();
    });

    // Delete Confirmed Trip
    $scope.deleteConfirmedTrip = function(trip) {
      if (!trip) return;
      if (confirm(`Are you sure you want to delete confirmed trip "${trip.title}"?`)) {
        PlannerService.deleteConfirmedTrip(trip.id, $scope.currentUser);
        $scope.showToast(`🗑️ Trip deleted.`);
        $scope.refreshUserTrips();
      }
    };

    // ------------------------------------------
    // LOCAL BUS & CABS (INFORMATION ONLY)
    // ------------------------------------------
    $scope.transitDestinationId = 'place_meenakshi';
    $scope.transitDestinationResults = null;

    $scope.searchDestinationTransit = function() {
      if (!$scope.transitDestinationId) return;

      const destId = $scope.transitDestinationId;
      const destPlace = DataService.getPlaces().find(p => p.id === destId) || 
                        DataService.getFoods().find(f => f.id === destId) ||
                        DataService.getHubs().find(h => h.id === destId);

      if (!destPlace) return;

      // Kutladampatti Waterfalls test case (incomplete / unavailable transit info)
      if (destId === 'place_kutladampatti') {
        $scope.transitDestinationResults = {
          destination: destPlace,
          buses: [],
          cabInfo: null,
          autoInfo: null,
          hasBuses: false,
          hasCabs: false,
          hasAutos: false
        };
        return;
      }

      // Look up matching bus schedules from MADURAI_DATA.busSchedules
      const schedules = window.MADURAI_DATA.busSchedules || [];
      let matchingBuses = schedules.filter(s => s.destinationId === destId);

      // Fallback: search busRoutes stops for destination name
      if (matchingBuses.length === 0) {
        const routes = DataService.getBusRoutes();
        routes.forEach(r => {
          if (r.stops && r.stops.some(st => st.toLowerCase().includes(destPlace.name.toLowerCase()))) {
            matchingBuses.push({
              busNumber: r.routeNo,
              route: r.name,
              destinationId: destId,
              time: 'Every ' + r.frequency
            });
          }
        });
      }

      const estTime = destPlace.coordinates ? TransitService.calculateTravelTime(
        TransitService.calculateDistance(9.9168, 78.1125, destPlace.coordinates.lat, destPlace.coordinates.lng)
      ) : 20;

      $scope.transitDestinationResults = {
        destination: destPlace,
        buses: matchingBuses,
        cabInfo: {
          available: true,
          serviceType: 'Cab',
          estimatedTravelTime: `${estTime} min`,
          estimatedFare: `₹${Math.round(80 + estTime * 4)}`
        },
        autoInfo: {
          available: true,
          serviceType: 'Auto Rickshaw',
          estimatedTravelTime: `${Math.max(5, estTime - 3)} min`,
          estimatedFare: `₹${Math.round(40 + estTime * 3)}`
        },
        hasBuses: matchingBuses.length > 0,
        hasCabs: true,
        hasAutos: true
      };
    };

    // Auto search transit for initial selected destination
    $scope.searchDestinationTransit();

    // ------------------------------------------
    // USER PROFILE MODAL & PAGE LOGIC
    // ------------------------------------------
    $scope.showProfileModal = false;
    $scope.isEditingProfile = false;
    $scope.editProfileForm = {};

    $scope.openProfileModal = function() {
      if (!$scope.currentUser) {
        $scope.openAuth('login');
        return;
      }
      $scope.switchTab('profile');
      $scope.refreshUserTrips();
      $scope.refreshUserReviews();
      $scope.loadUserStatistics();
    };

    $scope.closeProfileModal = function() {
      $scope.showProfileModal = false;
      $scope.isEditingProfile = false;
    };

    $scope.startEditProfile = function() {
      if (!$scope.currentUser) return;
      $scope.editProfileForm = {
        name: $scope.currentUser.name || '',
        email: $scope.currentUser.email || '',
        phone: $scope.currentUser.phone || '',
        address: $scope.currentUser.address || ''
      };
      $scope.isEditingProfile = true;
    };

    $scope.cancelEditProfile = function() {
      $scope.isEditingProfile = false;
      $scope.editProfileForm = {};
    };

    $scope.saveProfile = function() {
      if (!$scope.editProfileForm.name || !$scope.editProfileForm.email || !$scope.editProfileForm.phone) {
        alert('Name, Email and Phone number are required.');
        return;
      }
      AuthService.updateCurrentUser($scope.currentUser._id, {
        name: $scope.editProfileForm.name,
        email: $scope.editProfileForm.email,
        phone: $scope.editProfileForm.phone,
        address: $scope.editProfileForm.address ? $scope.editProfileForm.address.trim() : ''
      }).then(function(updated) {
        $scope.currentUser = updated;
        $scope.showToast('✅ Profile updated successfully!');
        $scope.isEditingProfile = false;
      }).catch(function(err) {
        alert(err);
      });
    };

    $scope.getUserTripMetrics = function() {
      const created = PlannerService.getCreatedPlans($scope.currentUser);
      const confirmedAll = PlannerService.getConfirmedTrips($scope.currentUser);

      const createdCount = created.length;
      const confirmedCount = confirmedAll.filter(t => t.status === 'CONFIRMED').length;
      const completedCount = confirmedAll.filter(t => t.status === 'COMPLETED').length;
      const overallTripCount = confirmedAll.length + created.length;

      return {
        createdCount,
        confirmedCount,
        completedCount,
        overallTripCount
      };
    };

    $scope.getVisitedPlacesList = function() {
      return PlannerService.getVisitedPlaces($scope.currentUser);
    };
      
    // ------------------------------------------
    // TOAST LOGIC
    // ------------------------------------------
    $scope.showToast = function(msg) {
      const toast = document.createElement('div');
      toast.className = 'toast-notification';
      toast.innerHTML = `<span>✨</span> ${msg}`;
      document.body.appendChild(toast);
      $timeout(() => toast.classList.add('show'), 50);
      $timeout(() => {
        toast.classList.remove('show');
        $timeout(() => toast.remove(), 300);
      }, 3500);
    };

    // ------------------------------------------
    // LEAFLET MAP DRAWING
    // ------------------------------------------
    function initializeMap() {
      if (map) return; // Prevent double init

      map = L.map('madurai-map', {
        center: [9.9252, 78.1198],
        zoom: 13,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          {
              maxZoom: 19,
              attribution: 'Tiles &copy; Esri'
          }
      ).addTo(map);
    }

    $scope.plotTripRoute = function(trip) {
      if (!map) return;
      
      // Clear old markers & lines
      mapMarkers.forEach(m => map.removeLayer(m));
      mapMarkers = [];
      if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
      }

      let rawStops = [];
      if (trip.stops && Array.isArray(trip.stops) && trip.stops.length > 0) {
        rawStops = trip.stops.map(s => ({ title: s.title || s.name, coords: s.coords || { lat: 9.9195, lng: 78.1193 } }));
      } else if (trip.places && Array.isArray(trip.places) && trip.places.length > 0) {
        rawStops = trip.places.map(p => ({ title: p.name || p.title, coords: p.coordinates || { lat: 9.9195, lng: 78.1193 } }));
      }

      if (rawStops.length === 0) return;

      function renderRouteWithUserLocation(userLat, userLng) {
        const allCoords = [];

        // 1. Plot User Real Current Location Marker
        if (userLat && userLng) {
          const userPin = L.divIcon({
            className: 'custom-map-pin user-location-pin',
            html: `<div class="pin-bubble">📍 You Are Here</div>`,
            iconSize: [110, 36],
            iconAnchor: [55, 36]
          });
          const uMarker = L.marker([userLat, userLng], { icon: userPin }).addTo(map).bindPopup(`<strong>Your Real Current Location</strong>`);
          mapMarkers.push(uMarker);
          allCoords.push([userLat, userLng]);
        }

        // 2. Plot Stops in Saved Order
        rawStops.forEach((s, idx) => {
          const isLast = idx === rawStops.length - 1;
          const lat = s.coords.lat;
          const lng = s.coords.lng;
          allCoords.push([lat, lng]);

          const pinClass = isLast ? 'custom-map-pin end-route-pin' : 'custom-map-pin';
          const pinHtml = isLast ? `<div class="pin-bubble">🚩 End Route: ${s.title}</div>` : `<div class="pin-bubble route-step">${idx + 1}</div>`;
          const iconSize = isLast ? [150, 36] : [32, 32];
          const iconAnchor = isLast ? [75, 36] : [16, 32];

          const pinIcon = L.divIcon({
            className: pinClass,
            html: pinHtml,
            iconSize: iconSize,
            iconAnchor: iconAnchor
          });

          const marker = L.marker([lat, lng], { icon: pinIcon })
            .addTo(map)
            .bindPopup(`<strong>${isLast ? 'End Route Stop:' : `Stop ${idx + 1}:`}</strong> ${s.title}`);

          mapMarkers.push(marker);
        });

        // 3. Draw Polyline Route
        routePolyline = L.polyline(allCoords, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.8,
          dashArray: '8, 8'
        }).addTo(map);

        // 4. Fit Map Bounds
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Query User's real position via Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            renderRouteWithUserLocation(pos.coords.latitude, pos.coords.longitude);
          },
          function() {
            renderRouteWithUserLocation($scope.currentLocation.lat || 9.9252, $scope.currentLocation.lng || 78.1198);
          },
          { timeout: 5000 }
        );
      } else {
        renderRouteWithUserLocation($scope.currentLocation.lat || 9.9252, $scope.currentLocation.lng || 78.1198);
      }
    };

    // Auto trigger initial route finding on load
    $timeout(() => {
      $scope.searchTransit();
    }, 500);

  }
]);
