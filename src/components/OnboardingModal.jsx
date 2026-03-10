import { useState } from "react";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "leaflet/dist/leaflet.css";
import { useMutation } from "@tanstack/react-query";
import { onBoard } from "../lib/api/auth";
import { useAuth } from "../hook/useAuth";
import { queryClient } from "../lib/queryClient";

function LocationPicker({ setLocation }) {
  useMapEvents({
    click(e) {
      setLocation([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}
export const OnboardingModal = ({ onComplete }) => {
  const { data: currentUserData, isLoading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "", // could get from auth context
    alternateMobile: "",
    houseNo: "",
    floor: "",
    area: "",
    landmark: "",
    address: "",
    dateOfBirth: null,
    deliveryPreference: "Ring Bell",
  });
  const [location, setLocation] = useState(null);
  // const onboardMutation = true;

  useEffect(() => {
    if (currentUserData?.data?.result?.mobile) {
      setForm((prev) => ({
        ...prev,
        mobile: currentUserData.data.result.mobile,
      }));
    }
  }, [currentUserData]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting current location:", error);
          alert("Could not get your location. Please allow location access.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onBoardMutation = useMutation({
    mutationFn: onBoard,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      onComplete();
    },
    onError: (error) => {
      console.error("Onboarding failed:", error);
      alert("Failed to save profile. Please try again.");
    },
  });

  const handleClick = () => {
    onBoardMutation.mutate({ ...form, location });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded shadow max-w-3xl w-full max-h-[90vh] mx-6  overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4 text-center text-black">
            Welcome! <br /> Complete your profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              className="border bg-white p-2 w-full mb-3"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="House No"
              className="border bg-white p-2 w-full mb-3"
              value={form.houseNo}
              onChange={(e) => handleChange("houseNo", e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Floor"
              className="border bg-white p-2 w-full mb-3"
              value={form.floor}
              onChange={(e) => handleChange("floor", e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Area"
              className="border bg-white p-2 w-full mb-3"
              value={form.area}
              onChange={(e) => handleChange("area", e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Landmark"
              className="border bg-white p-2 w-full mb-3"
              value={form.landmark}
              onChange={(e) => handleChange("landmark", e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Address"
              className="border bg-white p-2 w-full mb-3"
              onChange={(e) => handleChange("address", e.target.value)}
              required
            />

            <select
              className="border bg-white p-2 w-full"
              value={form.deliveryPreference}
              onChange={(e) =>
                handleChange("deliveryPreference", e.target.value)
              }
            >
              <option value="Ring Bell">Ring Bell</option>
              <option value="Doorstep">Door Step</option>
              <option value="In Hand">In Hand</option>
              <option value="Bag/Basket">Bag/Basket</option>
            </select>
            <div className="w-full">
              <DatePicker
                selected={form.dateOfBirth}
                onChange={(date) => handleChange("dateOfBirth", date)}
                placeholderText="Date of Birth"
                className="border p-2 w-full"
                dateFormat="yyyy-MM-dd"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>

            <input
              type="text"
              placeholder="Email"
              className="border bg-white p-2 w-full mb-3"
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Mobile number"
              className="border bg-white p-2 w-full mb-3"
              value={currentUserData?.data?.result?.mobile}
              // onChange={(e) => handleChange("mobile", e.target.value)}
              readOnly
            />
            <input
              type="text"
              placeholder="Alternative mobile number"
              className="border bg-white p-2 w-full mb-3"
              value={form.alternateMobile}
              onChange={(e) => handleChange("alternateMobile", e.target.value)}
              required
            />
          </div>
          <div className="h-64 mt-4 rounded overflow-hidden border">
            <MapContainer center={[20, 77]} zoom={5} className="h-full w-full">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution=""
              />
              {location && <Marker position={location} />}
              <LocationPicker setLocation={setLocation} />
            </MapContainer>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            📍 Use my current location
          </button>

          {/* <button
            className="btn btn-success text-white px-4 py-2 rounded w-full mt-5 mb-5"
            onClick={handleClick}
          >
            {onboardMutation.isPending ? "Saving..." : "Save & Continue"}
          </button> */}
          {!onBoardMutation.isPending ? (
            <button
              className="btn btn-success text-white px-4 py-2 rounded w-full mt-5 mb-5"
              onClick={handleClick}
            >
              Save & Continue
            </button>
          ) : (
            <button
              className="btn btn-success text-white px-4 py-2 rounded w-full mt-5 mb-5"
              disabled
            >
              <span className="loading loading-spinner loading-sm mr-2"></span>
              Saving...
            </button>
          )}
        </div>
      </div>
    </>
  );
};
