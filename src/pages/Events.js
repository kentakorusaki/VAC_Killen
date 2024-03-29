import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faImage } from '@fortawesome/free-solid-svg-icons';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytes } from "firebase/storage";
import Slider from "react-slick";
import Navbar from '../components/Navbar';
import EventCalendar from '../components/EventCalender';
import useToast from '../hooks/useToast';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import './Events.css';

const firebaseConfig = {
  apiKey: "AIzaSyCTpfM8O1jXnvUaRpT15ea53I7itKcPcQU",
  authDomain: "vackillen.firebaseapp.com",
  projectId: "vackillen",
  storageBucket: "vackillen.appspot.com",
  messagingSenderId: "367924533984",
  appId: "1:367924533984:web:5eb7df06c0d17c1d388e85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

function Events() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [photos, setPhotos] = useState([]);
  const [events, setEvents] = useState([]);
  const [dates, setDates] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const { isShowing, message, showToast } = useToast();
  const settings = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    arrows: true,
  };

  const fetchEvents = useCallback(async () => {
    if (!user) return; // Ensure there's a logged-in user
  
    const q = query(collection(db, "events"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    const loadedEvents = [];
    const loadedDates = new Set();
    for (const doc of querySnapshot.docs) {
      const eventData = doc.data();
      eventData.id = doc.id;
  
      const photoRefs = eventData.photoUrls || [];
      const photoURLs = await Promise.all(photoRefs.map(async (url) => {
        return url;
      }));
      eventData.photoUrls = photoURLs;
      loadedEvents.push(eventData);
      loadedDates.add(eventData.date);
    }
    setEvents(loadedEvents);
    setDates(Array.from(loadedDates).sort());
  }, [user]);

  useEffect(() => {
    const fetchAllEvents = async () => {
      // Assuming events are not user-specific or you have a fallback to fetch general events
      const q = query(collection(db, "events"));
      const querySnapshot = await getDocs(q);
      const loadedEvents = [];
      const loadedDates = new Set();
      querySnapshot.forEach((doc) => {
        const eventData = { id: doc.id, ...doc.data() };
        loadedEvents.push(eventData);
        loadedDates.add(eventData.date);
      });
      setEvents(loadedEvents);
      setDates(Array.from(loadedDates).sort());
    };
  
    fetchAllEvents(); // Fetch events when the component mounts
  
    // Listen for auth state changes to handle user-specific data if needed
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
  
    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []); 

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please log in to continue."); // Notify user to log in
      return; // Ensure there's a logged-in user
    }
  
    // Check if the user has selected more than 50 photos
    if (photos.length > 50) {
      showToast("You can only upload up to 50 photos."); // Use showToast instead of alert
      return; // Stop the function execution
    }
  
    showToast("Adding your event. Please hold on a moment!");
    setIsFormVisible(!isFormVisible);

    try {
      // Add event to Firestore
      const docRef = await addDoc(collection(db, "events"), {
        title,
        date,
        userId: user.uid,
      });
  
      const photosUrls = await Promise.all([...photos].map(async (photo) => {
        const photoRef = ref(storage, `events/${docRef.id}/${photo.name}`);
        await uploadBytes(photoRef, photo);
        return getDownloadURL(photoRef);
      }));
  
      // Update the event with photo URLs
      await updateDoc(doc(db, "events", docRef.id), {
        photoUrls: photosUrls
      });
  
      // Reset form fields
      setTitle('');
      setDate('');
      setPhotos([]);
  
      // Refresh the events displayed in the UI
      await fetchEvents(); // Assume this function exists to refresh event data
  
      showToast("Event added successfully!"); // Show success message
    } catch (error) {
      console.error("Error adding document: ", error);
      showToast("Failed to add event. Please try again."); // Show error message
    }
  };

  
  const handleFileChange = (e) => {
    setPhotos(e.target.files); // Update the photos state with the selected files
  };

  const deleteEvent = async (eventId) => {
    if (!user) return; // Ensure there's a logged-in user

    // Confirm before deleting
    if (window.confirm("Are you sure you want to delete this event?")) {
      await deleteDoc(doc(db, "events", eventId));
      // Update the UI by filtering out the deleted event
      setEvents(events.filter(event => event.id !== eventId));
      showToast("Event has been deleted. Reload Page.");
    }

  };

  const toggleFormVisibility = () => setIsFormVisible(!isFormVisible);

  const setFormVisibility = (isVisible) => {
    setIsFormVisible(isVisible);
  };

  const handleOverlayClick = () => {
    setFormVisibility(false);
  };

  return (
    <div className="Events">
      <Navbar />
      <h1>Events</h1>
      <EventCalendar />
      {isShowing && <div className="toast-message">{message}</div>}
      <div className="events-container">
        <div className="dates-list">
          {dates.map((date, index) => (
            <div key={index} className="date" onClick={() => handleDateClick(date)}>
              {date}
            </div>
          ))}
        </div>
        <div className="event-details">
          {selectedDate && (
            <div>
              {events.filter(event => event.date === selectedDate).map((event) => (
                <div key={event.id} className="event">
                  <h2>{event.title}</h2>
                  <div className="photos">
                    <Slider {...settings} className="my-slider">
                      {event.photoUrls?.map((url, index) => (
                        <div key={index}>
                          <img src={url} alt={`Event ${event.title}`} />
                        </div>
                      ))}
                    </Slider>
                  </div>
                  {user && (
                    <button className="delete-event-button" onClick={() => deleteEvent(event.id)}>
                      <FontAwesomeIcon icon={faTrashCan} /> Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {user && (
        <>
          <div className="white-box" onClick={toggleFormVisibility}>
            <FontAwesomeIcon icon={faImage} />
          </div>
          {isFormVisible && (
            <div className="form-overlay" onClick={handleOverlayClick}>
              <div className="form-container" onClick={(e) => e.stopPropagation()}>
                <div className="form">
                  <form onSubmit={handleSubmit}>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Event Title"
                      required
                    />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                    />
                    {/* Display the count of selected photos */}
                    <p>{photos.length} photo(s) selected</p>
                    <button type="submit">Submit</button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Events;