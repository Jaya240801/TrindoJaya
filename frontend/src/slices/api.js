//url api dari backend
export const url = process.env.REACT_APP_API_URL;

export const setHeaders = () => {
    const headers = {
        headers: {
            "x-auth-token": localStorage.getItem("token"),
        },
    };

    return headers;
};