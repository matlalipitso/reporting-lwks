const config = {
    // Use development URL in development, production URL in production
    API_BASE_URL: process.env.NODE_ENV === 'development' 
      ? process.env.REACT_APP_API_URL 
      : process.env.REACT_APP_API_URL_PRODUCTION || 'https://reporting-lwks.onrender.com'
  };
  
  export default config;
