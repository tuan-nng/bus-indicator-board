import Vue from 'vue'
import App from './App'
import * as VueGoogleMaps from "vue2-google-maps";
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.use(VueGoogleMaps, {
  load: {
    key: "<google Map API Key>",
    libraries: "places" // necessary for places input
  }
});

Vue.config.productionTip = false

Vue.use(BootstrapVue);

new Vue({
  render: h => h(App),
}).$mount('#app')
