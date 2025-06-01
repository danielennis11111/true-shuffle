# True Shuffle 2.0 🎵

A genuinely random playlist shuffling application for Spotify that provides truly random music discovery experiences.

## 🌟 Features

- **6 Shuffle Modes**: True Random, Never Played, Genre Mix, Genre Balanced, No Repeats, Mood-Based
- **Real-time Audio Analysis**: Track mood, energy, and audio features
- **Beautiful UI**: Modern Spotify-inspired design with responsive layout
- **Advanced Algorithms**: Fisher-Yates shuffle and sophisticated recommendation engine
- **Spotify Integration**: Full Web API and Playback SDK support

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Spotify Premium account
- Spotify Developer App credentials

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd true-shuffle-2.0
npm install
```

### 2. Spotify App Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://127.0.0.1:3000/callback`
4. Note your Client ID and Client Secret

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://127.0.0.1:3000/callback
PORT=3000
```

### 4. Run the Application
```bash
npm start
```

Visit `http://127.0.0.1:3000` to start using True Shuffle!

## 🎯 How It Works

1. **Connect Spotify**: Authenticate with your Spotify account
2. **Choose Discovery Mode**: Select from 6 different shuffle algorithms
3. **Customize Settings**: Set year ranges, moods, or genres
4. **Start Discovery**: Let True Shuffle find amazing music for you
5. **Enjoy**: Experience truly random music discovery

## 🔧 Shuffle Modes

### 🎲 True Random
Mathematically perfect randomization using Fisher-Yates algorithm

### 🌟 Never Played Songs
Discover tracks you've never heard before from Spotify's catalog

### 🎨 Mix Genres
Blend 2-6 genres for diverse musical experiences

### ⚖️ Genre Balanced
Ensure equal representation across different genres

### 🚫 No Repeats
Avoid recently played tracks for fresher listening

### 🎭 Mood Based
Find music matching specific moods (Happy, Chill, Energetic, etc.)

## 🛠️ Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Backend**: Express.js server
- **APIs**: Spotify Web API, Spotify Web Playback SDK
- **Algorithms**: Fisher-Yates shuffle, audio feature analysis

### Key Files
- `server.js` - Express server with Spotify OAuth
- `public/app.js` - Main application logic
- `public/index.html` - Main app interface
- `public/login.html` - Landing/login page
- `public/styles.css` - Custom styling

## 🚀 Deployment

### Environment Variables for Production
```env
SPOTIFY_CLIENT_ID=your_production_client_id
SPOTIFY_CLIENT_SECRET=your_production_client_secret
REDIRECT_URI=https://yourdomain.com/callback
PORT=3000
```

### Deployment Platforms
- **Vercel**: `vercel --prod`
- **Netlify**: Deploy with build command `npm run build`
- **Heroku**: `git push heroku main`

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- Spotify client secret is required for production
- Ensure HTTPS in production for secure token handling

## 🐛 Troubleshooting

### Common Issues

**"Authentication failed"**
- Check your Spotify client ID and secret
- Verify redirect URI matches exactly
- Ensure you're using `127.0.0.1` not `localhost`

**"No playback device found"**
- Ensure you have Spotify Premium
- Try refreshing the page
- Check browser console for errors

**"Failed to load tracks"**
- Check internet connection
- Verify Spotify API credentials
- Try a different shuffle mode

## 📝 Development

### Running in Development
```bash
npm run dev        # Start with nodemon
npm run build:css  # Build Tailwind CSS
npm run dev:all    # Run both concurrently
```

### Project Structure
```
true-shuffle-2.0/
├── public/
│   ├── index.html      # Main app
│   ├── login.html      # Landing page
│   ├── app.js          # Main logic
│   ├── styles.css      # Styling
│   └── shuffle.js      # Shuffle algorithms
├── server.js           # Express server
├── package.json        # Dependencies
└── README.md          # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Spotify for their excellent Web API and Playback SDK
- Fisher-Yates for the perfect shuffle algorithm
- The music discovery community for inspiration

---

**Ready to experience truly random music? Get started now!** 🎵 