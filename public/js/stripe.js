import axios from "axios"
import { showAlert } from "./alerts"
const stripe = Stripe('pk_test_51NI0VjGemn6XITw6oGsFXrL3t6XEN4hhPXxwfOzSlEWKTqtJih77wYxnGW3gawFEKBqpIjucUGhzNt45CFFEXQXR00e00m7nYM')

export const bookTour = async tourid => {
    try {
        const session = await axios(`http://127.0.0.1:8000/api/v1/bookings/checkout-session/${tourid}`)

        await stripe.redirectToCheckout({ sessionId: session.data.session.id })
    } catch (err) {
        showAlert('error', err)
    }
}