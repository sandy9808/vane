import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import * as firebase from 'firebase';
import { Grid } from '@material-ui/core';
import Forecast from '../components/MainPage/Forecast';
import DetailedInfo from '../components/MainPage/DetailedInfo';
import ApplicationBar from '../components/AppBar/AppBar';
import CurrentWeather from '../components/MainPage/CurrentWeather';

require('dotenv').config();

const config = {
	apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
	authDomain: process.env.REACT_APP_AUTH_DOMAIN,
	databaseURL: process.env.REACT_APP_DATABASE_URL,
	projectId: process.env.REACT_APP_PROJECT_ID,
	storageBucket: '',
	messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID
};

firebase.initializeApp(config);

const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			activeCity: 'Seoul',
			user: null,
			forecast: [],
			temperatureUnits: 'metric',
			temperatureClass: '',
			savedCities: null
		};
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.apiSearch = this.apiRequest.bind(this);
		this.handleAddCity = this.handleAddCity.bind(this);
		this.handleSavedCities = this.handleSavedCities.bind(this);
		this.handleCityClick = this.handleCityClick.bind(this);
		this.citiesRef = firebase.database().ref('cities');
	}

	// Mount original city

	componentDidMount() {
		this.apiRequest(this.state.activeCity);
	}

	// Yahoo! Weather API request

	apiRequest(cityName) {
		const locationUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=${
			this.state.temperatureUnits
		}&appid=${WEATHER_API_KEY}`;
		axios
			.get(locationUrl)
			.then(result => {
				const currentConditions = result.data;
				console.log(currentConditions);
				this.setState({
					cityName: currentConditions.name,
					temp: currentConditions.main.temp,
					iconId: currentConditions.weather[0].id,
					description: currentConditions.weather[0].main,
					humidity: currentConditions.main.humidity,
					time: currentConditions.dt,
					high: currentConditions.main.temp_max,
					low: currentConditions.main.temp_min,
					sunrise: currentConditions.sys.sunrise,
					sunset: currentConditions.sys.sunset,
					windSpeed: `${currentConditions.wind.speed} ${
						this.state.temperatureUnits === 'metric' ? 'm/s' : 'mph'
					}`
				});
				this.setTemperatureClass();
			})
			.catch(err => console.log(err));
		const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=${
			this.state.temperatureUnits
		}&appid=${WEATHER_API_KEY}`;
		axios.get(forecastUrl).then(result => {
			console.log(result);
			this.setState({ forecast: result.data.list });
		});
	}

	// App city search bar functions

	handleChange(e) {
		e.preventDefault();
		this.setState({
			activeCity: e.target.value
		});
	}

	handleSubmit(e) {
		e.preventDefault();
		this.apiRequest(this.state.activeCity);
	}

	// Set temperature class for color combos

	convertTemperature() {
		if (this.state.temperatureUnits === 'metric') {
			return (this.state.temp * 9) / 5 + 32;
		} else {
			return this.state.temp;
		}
	}

	setTemperatureClass() {
		let temp = this.convertTemperature();
		if (temp >= 100) {
			this.setState({
				temperatureClass: 'boiling'
			});
		} else if (temp < 100 && temp >= 85) {
			this.setState({
				temperatureClass: 'hot'
			});
		} else if (temp < 85 && temp >= 65) {
			this.setState({
				temperatureClass: 'warm'
			});
		} else if (temp < 65 && temp >= 50) {
			this.setState({
				temperatureClass: 'perfect'
			});
		} else if (temp < 50 && temp >= 32) {
			this.setState({
				temperatureClass: 'cool'
			});
		} else if (temp < 32) {
			this.setState({
				temperatureClass: 'freezing'
			});
		}
	}

	// User sign in with Google Firebase

	signIn() {
		const provider = new firebase.auth.GoogleAuthProvider();
		firebase
			.auth()
			.signInWithPopup(provider)
			.then(result => {
				const user = result.user;
				this.setState({ user });
				this.handleSavedCities();
			});
	}

	// User sign out with google firebase

	signOut() {
		firebase.auth().signOut();
		this.setState({
			user: null,
			savedCities: null
		});
	}

	// Toggle Celsius and Fahrenheit
	changeUnits() {
		setTimeout(() => {
			this.state.temperatureUnits === 'imperial'
				? this.setState({ temperatureUnits: 'metric' })
				: this.setState({ temperatureUnits: 'imperial' });
			this.apiRequest(this.state.activeCity);
		});
	}

	// Add city to database

	handleAddCity(e) {
		e.preventDefault();
		if (this.state.user != null) {
			this.citiesRef.push({
				city: this.state.activeCity,
				user: this.state.user.email
			});
		}
		this.handleSavedCities();
	}

	// Get saved cities for each user

	handleSavedCities() {
		this.citiesRef.on('value', data => {
			const cityList = [];
			data.forEach(city => {
				cityList.push({
					city: city.val().city,
					user: city.val().user
				});
			});
			if (this.state.user != null) {
				let userCities = cityList.filter(city => city.user === this.state.user.email);
				this.setState({
					savedCities: userCities
				});
			}
		});
	}

	handleCityClick(city) {
		this.setState({ activeCity: city });
		this.apiSearch(city);
	}

	// Create cookie to save information set as string -> array
	// Read cookie

	render() {
		return (
			<Grid
				container
				justify="center"
				alignItems="center"
				className={this.state.temperatureClass}
				id="main">
				<Grid item xs={12} md={8}>
					<ApplicationBar
						firebase={firebase}
						signIn={() => this.signIn()}
						signOut={() => this.signOut()}
						currentUser={this.state.user === null ? 'Guest' : this.state.user.displayName}
						handleChange={this.handleChange}
						handleSubmit={this.handleSubmit}
						handleUnits={() => this.changeUnits()}
						units={this.state.temperatureUnits}
						addCity={this.handleAddCity}
						savedCities={this.state.savedCities}
						cityClick={this.handleCityClick}
					/>
					<CurrentWeather
						city={this.state.cityName}
						temp={this.state.temp}
						iconId={this.state.iconId}
						description={this.state.description}
					/>
					<Forecast forecast={this.state.forecast} tempClass={this.state.temperatureClass} />
					<DetailedInfo
						high={this.state.high}
						low={this.state.low}
						sunrise={this.state.sunrise}
						sunset={this.state.sunset}
						windSpeed={this.state.windSpeed}
						humidity={this.state.humidity}
						time={this.state.time}
					/>
				</Grid>
			</Grid>
		);
	}
}

export default App;
