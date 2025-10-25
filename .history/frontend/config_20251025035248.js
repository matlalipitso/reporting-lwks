const config = {
    // Use development URL in development, production URL in production
    API_BASE_URL: process.env.NODE_ENV === 'development' 
      ? process.env.REACT_APP_API_URL || 'http://localhost:4000/api'
      : process.env.REACT_APP_API_URL_PRODUCTION || 'https://reporting-lwks.onrender.com/api'
  };
  
  export default config;