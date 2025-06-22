# Ascend AI Backend API

A robust Node.js backend API for the Ascend AI interview coaching platform, built with Express.js and TypeScript.

## Features

- **TypeScript**: Full type safety and modern JavaScript features
- **Express.js**: Fast, unopinionated web framework
- **CORS**: Configured for frontend integration
- **Environment Variables**: Secure configuration management
- **Error Handling**: Comprehensive error middleware
- **Validation**: Request validation middleware
- **Logging**: Morgan HTTP request logger
- **Security**: Helmet.js security headers
- **Hot Reload**: Development server with automatic restarts

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3001
TAVUS_API_KEY=your_tavus_api_key_here
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here
TAVUS_REPLICA_ID=your_tavus_replica_id_here
NODE_ENV=development
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests (Jest)

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Interview Routes
- **POST** `/api/interview/start` - Start a new interview session
- **GET** `/api/interview/status/:sessionId` - Get interview status (placeholder)
- **POST** `/api/interview/end` - End interview session (placeholder)

## Request/Response Examples

### Start Interview

**POST** `/api/interview/start`

```json
{
  "jobTitle": "Senior Frontend Developer",
  "company": "Netflix",
  "questionType": "preset",
  "selectedPreset": "frontend",
  "feedbackMetrics": {
    "answerStructure": true,
    "speechDelivery": true,
    "bodyLanguage": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interview session started successfully",
  "sessionId": "session_1703123456789_abc123def",
  "data": {
    "videoUrl": null,
    "status": "generating",
    "estimatedDuration": "45 minutes",
    "interviewConfig": {
      "jobTitle": "Senior Frontend Developer",
      "company": "Netflix",
      "questionType": "preset",
      "selectedPreset": "frontend",
      "feedbackMetrics": {
        "answerStructure": true,
        "speechDelivery": true,
        "bodyLanguage": true
      }
    },
    "createdAt": "2023-12-21T10:30:56.789Z"
  }
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | No (default: 3001) |
| `TAVUS_API_KEY` | Tavus API key for video generation | Yes |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID for audio | Yes |
| `TAVUS_REPLICA_ID` | Tavus replica ID for AI avatar | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## Project Structure

```
server/
├── src/
│   ├── controllers/          # Route controllers
│   ├── middleware/           # Custom middleware
│   ├── routes/              # API routes
│   ├── types/               # TypeScript type definitions
│   └── index.ts             # Application entry point
├── dist/                    # Compiled JavaScript (generated)
├── .env.example             # Environment variables template
├── .eslintrc.js            # ESLint configuration
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Development

### Adding New Routes

1. Create a new route file in `src/routes/`
2. Add controller logic in `src/controllers/`
3. Import and use in `src/index.ts`

### Error Handling

The API uses centralized error handling. All errors are caught by the error middleware and returned in a consistent format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Validation

Request validation is handled by middleware in `src/middleware/validation.ts`. Add new validation functions as needed.

## Integration with Tavus API

The `/api/interview/start` endpoint is prepared for Tavus API integration. Uncomment and configure the Tavus API call in `src/controllers/interviewController.ts` when ready to integrate.

## Security

- CORS configured for frontend origins
- Helmet.js for security headers
- Request size limits
- Input validation
- Environment variable protection

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include request validation
4. Update documentation
5. Test your changes

## License

MIT License - see LICENSE file for details