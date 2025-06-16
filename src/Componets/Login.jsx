import React, { useState, useEffect } from "react";
import "./login.css";
import { useNavigate } from "react-router-dom";
import { globalVariable } from "./globalVariables";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode"; // Correct import

import { getStorage, ref, uploadBytes } from "firebase/storage";
import { initializeApp } from "firebase/app";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"; // Import icons


function Login({ closeModal }) {
  const navigate = useNavigate();
  const firebaseConfig = {
    apiKey: "AIzaSyAbZHN7lAKXQNV4aQcGl9W6sSjpPCgKVT0",
    authDomain: "business-sehyogi.firebaseapp.com",
    projectId: "business-sehyogi",
    storageBucket: "business-sehyogi.appspot.com",
    messagingSenderId: "780888034585",
    appId: "1:780888034585:web:8b44f036a8c66570df4988",
    measurementId: "G-ZBK29X70KK",
  };

  const app = initializeApp(firebaseConfig);
  const storage = getStorage(app);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [UserType, setUserType] = useState("Founder");
  const [isLogin, setIsLogin] = useState(false);

  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleClick = async (event) => {
    event.preventDefault();
    try {
      // Step 1: Validate email and password
      const loginUrl = `http://${globalVariable.value}/login?email=${formData.email}&password=${formData.password}`;
      const loginResponse = await fetch(loginUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!loginResponse.ok) {
        alert("Invalid email or password.");
        return;
      }

      const isValidUser = await loginResponse.json();

      if (!isValidUser) {
        alert("Invalid email or password.");
        return;
      }


      // let data = await response.json();


      const userUrl = `http://${globalVariable.value}/getUser/${formData.email}`;
      const userResponse = await fetch(userUrl, { method: "GET" });

      if (!userResponse.ok) {
        alert("Error fetching user details.");
        return;
      }

      const userDetails = await userResponse.json();



      if (userDetails["category"] == "Investor") {
        const investorUrl = `http://${globalVariable.value}/getInvestor/${userDetails['userId']}`;
        const investorResponse = await fetch(investorUrl, { method: "GET" });

        const investorDetais = await investorResponse.json();
        
        sessionStorage.setItem("investorToken", investorDetais["investorId"]);

      }



      sessionStorage.setItem("Token", userDetails["userId"]);

      sessionStorage.setItem("Email", userDetails.email);

      if (userDetails.category === "Founder") {
        navigate("/founder/FounderPostHome");
      } else if (userDetails.category === "Investor") {
        navigate("/investor/InvestorDashboard");
      } else {
        alert("Unknown user category. Please contact support.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      alert("An error occurred while logging in. Please try again.", error);
    }
  };



  const handleSuccess = async (credentialResponse) => {
    try {
      const decode = jwtDecode(credentialResponse?.credential);
      const emailId = decode["email"];
      const imageUrl = decode["picture"];

      let url = `http://${globalVariable.value}/checkEmail/${emailId}`;
      let response = await fetch(url, { method: "GET" });

      let responseText;
      if (response.ok) {
        responseText = await response.text();
      } else {
        console.error("Error fetching data:", response.status);
        return;
      }

      if (responseText === "true") {
        let url = `http://${globalVariable.value}/login?email=${emailId}&password=businessSehyogi9876543210`;
        let response = await fetch(url, { method: "GET" });
        let responseText = await response.json();
        if (responseText) {
          let url = `http://${globalVariable.value}/getUser/${emailId}`;
          let response = await fetch(url, { method: "GET" });
          let responseText2 = await response.json();
          sessionStorage.setItem("Token", responseText2.userId);
          sessionStorage.setItem("Email", responseText2.email);
          navigate("/founders/FounderPostHome");
        } else {
          alert("Sorry.. Your account has been blocked by admin..!");
        }
      } else {
        //fetch date from server and pass in the body to add current date in database.
        let url = `http://${globalVariable.value}/getCurrentDateTime`;
        let response = await fetch(url, {
          method: "get",
        });

        let date = "";

        if (response.ok) {
          date = await response.text();
        } else {
          console.error("Error fetching data:", response.status);
        }


        let urlRegisterUser = `http://${globalVariable.value}/registerUser`;
        let responseRegisterUser = await fetch(urlRegisterUser, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: 0,
            firstName: decode["given_name"],
            lastName: decode["family_name"],
            email: decode["email"],
            password: "businessSehyogi9876543210",
            category: "Founder",
            visible: true,
            emailVerified: true,
            contactnoVerified: false,
            dateTimeOfRegistration: date,
          }),
        });

        let data = await responseRegisterUser.json();
        let userId = data["userId"];
        let imageName = userId + ".jpg";

        url = `http://${globalVariable.value}/updateUserPhoto/${userId}`;
        response = await fetch(url, {
          method: "POST",
          body: imageName,
        });

        const imageBlob = await fetchImage(imageUrl);
        const jpegBlob = await convertBlobToJpeg(imageBlob);
        await uploadImageToFirebase(jpegBlob, userId);
        closeModal();
        navigate("/founder/FounderPostHome");
      }
    } catch (error) {
      console.error("Error processing Google login:", error);
    }
  };

  const fetchImage = async (imageUrl) => {

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch the image.");
      }
      return await response.blob();
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  };

  const convertBlobToJpeg = async (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (jpegBlob) => {
              resolve(jpegBlob);
            },
            "image/jpeg",
            0.95
          );
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const uploadImageToFirebase = async (blob, userId) => {
    try {
      const storageRef = ref(storage, `userProfileImages/${userId}.jpg`);
      const result = await uploadBytes(storageRef, blob);
    } catch (error) {
      console.error("Error uploading image to Firebase:", error);
    }
  };

  const handleError = () => {
    console.log("Error during Google Login.");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleUserTypeSelection = (type) => {
    setUserType(type);
  };

  const onLogin = () => {
    setIsLogin(true);
  };

  // Check if user is already logged in
  useEffect(() => {
    const token = sessionStorage.getItem("Token"); // Change localStorage to sessionStorage
    if (token) {
      navigate("/"); // Redirect to home if token exists
    }
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="signup-modal">
        <div className="modal-content">
          <button className="Close-button-login" onClick={closeModal}>
            X
          </button>
          <h2 className="modal-title">Log In</h2>
          <form className="signup-form" onSubmit={handleClick}>
            <input
              className="founder-signup-field"
              type="email"
              name="email"
              value={formData.email}
              placeholder="Enter Your Email"
              onChange={handleChange}
            />
            <div className="password-container">
              <input
                className="founder-signup-field"
                type={showPassword ? "text" : "password"} // Toggle input type
                name="password"
                value={formData.password}
                placeholder="Enter Your Password"
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
              </button>
            </div>
            <button className="signup-button-login" type="submit">
              Login
            </button>
          </form>
          <hr />
          <GoogleOAuthProvider
            className="google-oath-login"
            clientId="422099475744-bld6nl3obcj7n6s5ct4i93ln52spcob7.apps.googleusercontent.com"
          >
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              text="continue_with"
            />
          </GoogleOAuthProvider>
        </div>
      </div>
    </div>
  );
}

export default Login;