const { Pool, Client } = require('pg');
import express from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import router from './managementRoute'
import client from './db';
import { mapUser } from './functions';


const app = express();


const getAllUsers = async() => {
    try {
        const allTodos = await client.query("SELECT * FROM users");
        return allTodos.rows;
        
    } catch (error) {
        console.log(error)
    }
}

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());
app.use('/management',router)
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
    return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, 'mySecretKey', { expiresIn: '30m' });
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


app.post('/api/login', async (req, res) => {
    const {usernameOrEmail , password} = req.body;
    const user = await client.query('SELECT * FROM users WHERE (username = $1 OR email = $1) AND password = $2 ',[usernameOrEmail , password]);
    const userFound = user.rows[0]
    if (userFound) {
        console.log('Reached here')
        const accessToken = generateAccessToken(userFound);
        const refreshToken = generateRefreshToken(userFound);
        res.cookie('AccessT',accessToken);
        res.cookie('AccessRefreshT',refreshToken)
        refreshTokens.push(refreshToken);
        res.json({
            username : userFound.username,
            isAdmin : userFound.is_admin,
            email : userFound.email,
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



app.post('/api/logout', verify, (req, res) => {
    const refreshToken = req.body.token;
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
    const tokenToBeRemoved = req.headers.authorization;
    blockedTokens.push(tokenToBeRemoved)
    res.status(200).json('You logged out successfully');
})

app.post('/api/checklogin', verify, async (req, res) => {
    console.log('Hitted');
    const user = await client.query('SELECT * FROM users WHERE id = $1',[req.user.id]);
    const userResponse = user.rows[0];
    console.log(userResponse);
    const detailsTobeSent = {
        email : userResponse.email,
        username : userResponse.username,
        isAdmin : userResponse.is_admin
    }
    res.status(200).send(userResponse ? detailsTobeSent : null);

})


app.post('/api/register', async(req, res) => {
   try {
    const allItems = await getAllUsers();
    const lastId = allItems[allItems.length - 1].id + 1
    const {email, password} = req.body;
    const user = await client.query('SELECT * FROM users WHERE email = $1',[email]);
    const userExists = user.rows[0]
    if (userExists) {
        res.status(600).send({message : 'Email is already used'})
    }
    else {
        const insertUser = await client.query('INSERT INTO users(id ,email, password, is_admin) VALUES($1,$2, $3, FALSE) RETURNING *',
        [lastId, email, password]);
        res.status(200).send({message : 'Registration went successful',userInserted : mapUser(insertUser.rows[0])});
    } 
       
   } catch (error) {
       console.log(error)
       
   }
})


app.get('/',(req, res) => {
    res.json({message : 'Here you recahed'});
})
app.listen(8000, (req, res) => {

    client.connect((err) => {
        if (err) {
            console.log(err)
        }
        else {
            console.log('Connected')
            client.query('CREATE TABLE IF NOT EXISTS Users(id int, username varchar(255), email varchar(255), password varchar(255), is_admin Boolean)')
        }
    })
    
})











