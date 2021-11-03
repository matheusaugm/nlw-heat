import axios from 'axios';
import prismaClient from "../prisma"
import { sign } from "jsonwebtoken";
import "dotenv"


/**
 * Receber code(string) OK
 * Recuperar access_token no github OK
 * Recuperar infos do user no github OK
 * Verificar se o usuário existe no nosso DB 
 * ---SIM = Gera um token
 * ---NAO = Cria no DB, gera um token 
 * Retornar o token com as infos do user
 */
interface IAccessTokenResponse {
    access_token: string
};
interface IUserResponse {
    avatar_url: string,
    name: string,
    id: number,
    login: string
}

class AuthenticateUserService {

    async execute(code: string) {
        const url = "https://github.com/login/oauth/access_token";

        const { data: AccessTokenResponse } = await axios.post<IAccessTokenResponse>(url, null, {
            params: {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            },

            headers: {

                "Accept": "application/json"

            },

        })

        const response = await axios.get<IUserResponse>("https://api.github.com/user", {
            headers: {
                authorization: `Bearer ${AccessTokenResponse.access_token}`
            }
        });



        const {login, avatar_url, id, name} = response.data;

        let user = await prismaClient.user.findFirst({
            where:{ 
                github_id:id
            }
        })
        if (!user) {
           user =  await prismaClient.user.create({
                data:{
                    github_id:id,
                    login,
                    avatar_url,                    
                    name
                }
            })
        }
        const token = sign({
            user:{
                name:user.name,
                avatar_url: user.avatar_url,
                id:user.id
            }

        },
        process.env.JWT_SECRET,
        {
            subject:user.id,
            expiresIn:"1d"
        }
        )

        return {token, user};
    }


}

export { AuthenticateUserService }