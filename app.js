const { Pool, Client } = require('pg');
import express from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';


const app = express();


const users = [
    {
        id: "1",
        username: 'John',
        password: '12345678',
        isAdmin: true
    },
    {
        id: "2",
        username: 'jane',
        password: 'Jane0908',
        isAdmin: false
    }
]
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json())
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(session({
    secret: "fdfddsds",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: true,

    }
}))

let refreshTokens = [];
let blockedTokens = [];
const generateAccessToken = (user) => {
    return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, 'mySecretKey', { expiresIn: '2m' });
}

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, "myRefreshSecretKey")
}

app.post('/api/refreshToken', (req, res) => {
    const refreshToken = req.body.token
    if (!refreshToken) return res.status(401).json("You are not authenticated")
    if (!refreshTokens.includes(refreshToken)) {
        return res.status(403).json('Refresh token is not valid')
    }
    jwt.verify(refreshToken, "myRefreshSecretKey", (err, user) => {
        err && console.log(err);
        refreshTokens = refreshTokens.filter((token, index) => token !== refreshToken);
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        refreshTokens.push(newRefreshToken);
        res.cookie('AccessT',newAccessToken)
        res.cookie('AccessRefreshT',newRefreshToken)
        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        })
    })
})


app.post('/api/login', (req, res) => {
    const {username , password} = req.body;
    console.log('username is' + username)
    const user = users.find((u) => {
        return u.username === username && u.password === password
    });
    if (user) {
        console.log('Reached here')
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        res.cookie('AccessT',accessToken);
        res.cookie('AccessRefreshT',refreshToken)
        refreshTokens.push(refreshToken);
        res.json({
            username : user.username,
            isAdmin : user.isAdmin,
            accessToken,
            refreshToken,
        });
      } else {
        res.status(400).json("Username or password incorrect!");
      } 
})

const verify = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token, "mySecretKey", (err, user) => {
            if (err) {
                return res.status(401).json("Json token is not valid")
            }
            if (blockedTokens.includes(authHeader)) {
                return res.status(402).json('Josn token is blocked');
            }
            console.log('You are authenticated now')
            req.user = user;
            next();
        })
    } else {
        res.status(401).json("You are not authenticated")
    }

}


app.delete("/api/users/:userId", verify, (req, res) => {
    console.log(req.user)
    if (req.user.id === req.params.userId || req.user.isAdmin) {
        res.status(200).json('User has been deleted')

    }
    else {
        res.status(403).json('You are not allowed to delete this user')
    }

})

app.post('/api/logout', verify, (req, res) => {
    const refreshToken = req.body.token;
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
    const tokenToBeRemoved = req.headers.authorization;
    blockedTokens.push(tokenToBeRemoved)
    res.status(200).json('You logged out successfully');
})

app.post('/api/checklogin', verify, (req, res) => {
    console.log('Hitted');
    const userResponse = users.find(u => u.id === req.user.id)
    console.log(userResponse);
    const detailsTobeSent = {
        username : userResponse.username,
        isAdmin : userResponse.isAdmin
    }
    res.status(200).send(userResponse ? detailsTobeSent : null);

})
app.get('/cookie', (req, res) => {
    res.cookie('123', 'dwqsa')
    res.send('xas');
});
app.listen(8000, (req, res) => {


    console.log("Backend server is running")
})




/**
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '15111996',
  port: 5432,
})

client.connect((err) => {
   //
 **/




