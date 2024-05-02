import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'react-toastify';
import { setHeaders, url } from './api';

const initialState = {
    stateProducts: [],
    stateRefreshProd: 0,
    stateSelectedProd: [],
    status: null,
    createStatus: null,
    editStatus: null,
    deleteStatus: null,
};

//fetch products
export const productsFetch = createAsyncThunk(
    "products/productsFetch",
    async () => {
        try {
            const response = await axios.get(`${url}/products`);
            return response.data;
        } catch (error) {
            console.log(error);
        }
    }
);

//create products
export const productsCreate = createAsyncThunk(
    "products/productsCreate",
    async (values) => {
        try {
            const response = await axios.post(
                `${url}/products`,
                values,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data, {
                position: "bottom-left",
            });
        }
    }
);

//edit products
export const productsEdit = createAsyncThunk(
    "products/productsEdit",
    async (values) => {
        try {
            const response = await axios.put(
                `${url}/products/${values.product.productId}`,
                values.product,
                setHeaders(),
            );

            return response.data;
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data, {
                position: "bottom-left",
            });
        }
    }
);

//delete products
export const productsDelete = createAsyncThunk(
    "products/productsDelete",
    async (productId) => {
        try {
            const response = await axios.delete(
                `${url}/product/${productId}`,
                setHeaders(),
            );

            return response.data;
        } catch (error) {
            console.log(error.response.data);
            toast.error(error.response?.data, {
                position: "bottom-left",
            });
        }
    }
);

//redux reducers atau pembuatan state untuk digunakan pada suatu komponen
const sliceProducts = createSlice({
    name: "products",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(productsFetch.pending, (state, action) => {
                state.status = "pending";
            })
            .addCase(productsFetch.fulfilled, (state, action) => {
                state.stateProducts = action.payload;
                state.status = "success";
            })
            .addCase(productsFetch.rejected, (state, action) => {
                state.status = "rejected";
            })
            .addCase(productsCreate.pending, (state, action) => {
                state.status = "pending";
            })
            .addCase(productsCreate.fulfilled, (state, action) => {
                state.stateProducts.push(action.payload);
                state.createStatus = "success";
                state.stateRefreshProd = Math.random();
                toast.success("Produk Telah Dibuat!", {
                    position: "bottom-left"
                });
            })
            .addCase(productsCreate.rejected, (state, action) => {
                state.status = "rejected";
            })
            .addCase(productsEdit.pending, (state, action) => {
                state.editStatus = "pending";
            })
            .addCase(productsEdit.fulfilled, (state, action) => {
                if (action.payload) {
                    const updatedCategory = state.stateProducts.map((product) =>
                        product.product_id === action.payload.product_id ? action.payload : product
                    );
                    state.stateProducts = updatedCategory;
                    state.editStatus = "success";
                    state.stateRefreshProd = Math.random();
                    toast.info("Product Telah Diedit!", {
                        position: "bottom-left",
                    });
                } else {
                    toast.error("Product Masih Digunakan!", {
                        position: "bottom-left",
                    });
                }
            })
            .addCase(productsEdit.rejected, (state, action) => {
                state.editStatus = "rejected";
            })
            .addCase(productsDelete.pending, (state, action) => {
                state.deleteStatus = "pending";
            })
            .addCase(productsDelete.fulfilled, (state, action) => {
                if (action.payload) {
                    const newList = state.stateProducts.filter(
                        (item) => item.product_id !== action.payload.product_id
                    );
                    state.stateProducts = newList;
                    state.deleteStatus = "success";
                    state.stateRefreshProd = Math.random();
                    toast.success("Product Telah Dihapus!", {
                        position: "bottom-left",
                    });
                } else {
                    toast.error("Product Masih Digunakan!", {
                        position: "bottom-left",
                    });
                }
            })
            .addCase(productsDelete.rejected, (state, action) => {
                state.deleteStatus = "rejected";
            });
    },
});

export default sliceProducts.reducer;
