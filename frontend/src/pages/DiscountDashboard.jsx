import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Bar } from "react-chartjs-2";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Link } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [salesData, setSalesData] = useState([]);
  const [itemSalesData, setItemSalesData] = useState([]);
  const [mostSoldItems, setMostSoldItems] = useState([]);
  const [leastSoldItems, setLeastSoldItems] = useState([]);
  const [mostSalesHour, setMostSalesHour] = useState("");
  const [leastSalesHour, setLeastSalesHour] = useState("");
  const [discountHours, setDiscountHours] = useState(0);
  const [discountItems, setDiscountItems] = useState([]);
  const [message, setMessage] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    const discountAppliedTime = localStorage.getItem("discountButtonDisabled");

    if (discountAppliedTime) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - discountAppliedTime;

      if (elapsedTime >= 3600000) {
        // If more than 1 hour has passed, enable the button
        setIsDisabled(false);
        localStorage.removeItem("discountButtonDisabled");
      } else {
        // If less than 1 hour has passed, keep the button disabled and set a timeout for the remaining time
        setIsDisabled(true);
        setTimeout(() => {
          setIsDisabled(false);
          localStorage.removeItem("discountButtonDisabled");
        }, 3600000 - elapsedTime);
      }
    }
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    axios
      .get("http://localhost:3001/api/admindis/dashboard")
      .then((response) => {
        const data = response.data;
        setSalesData(data.hourlySales);
        setItemSalesData(data.itemSales);
        setMostSalesHour(data.mostSalesHour);
        setLeastSalesHour(data.leastSalesHour);
        setMostSoldItems(data.mostSoldItems);
        setLeastSoldItems(data.leastSoldItems);
        setDiscountHours(data.discountedHours);
        setDiscountItems(data.discountedItems);
      })
      .catch((err) => console.error(err));
  }, []);
  const navigate = useNavigate();
  const handleManageProductsClick = () => {
    navigate("/products"); // Navigates to the /products screen
  };

  const handleDiscountNow = (type) => {
    // Disable the button and save the current time to local storage
    setIsDisabled(true);
    const discountAppliedTime = Date.now(); // Get the current timestamp
    localStorage.setItem("discountButtonDisabled", discountAppliedTime);

    // Apply discount now function
    axios
      .post("http://localhost:3001/api/discount/apply-discount", { type })
      .then((response) => {
        // Check if the response contains any items
        if (!response.data || response.data.length === 0) {
          alert("No eligible items available for discount.");
          setMessage("No eligible items available for discount.");
          setIsDisabled(false);
          localStorage.removeItem("discountButtonDisabled");
          return;
        }

        setMessage(`Discount applied successfully for ${type} items.`);
        // Refetch updated data
        axios
          .get("http://localhost:3001/api/admindis/dashboard")
          .then((res) => {
            setSalesData(res.data.hourlySales);
            setDiscountItems(res.data.discountedItems);
          });
      })
      .catch((err) => {
        setMessage(`Error applying discount: ${err.message}`);
        setIsDisabled(false);
        localStorage.removeItem("discountButtonDisabled");
      });

    // Re-enable the button after 1 hour (3600000 ms)
    setTimeout(() => {
      setIsDisabled(false);
      localStorage.removeItem("discountButtonDisabled");
    }, 3600000);
  };

  const generatePDF = () => {
    const input = document.getElementById("reportContent");

    // Element to ignore
    const elementToIgnore = document.getElementById("elementToIgnore");

    // Hide the element before capturing the canvas
    if (elementToIgnore) {
      elementToIgnore.style.display = "none";
    }

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      // Set the title font size
      pdf.setFontSize(16);

      // Center the title
      const pageWidth = pdf.internal.pageSize.getWidth();
      const title = "Sales Report";
      const textWidth =
        (pdf.getStringUnitWidth(title) * pdf.internal.getFontSize()) /
        pdf.internal.scaleFactor;
      const xOffset = (pageWidth - textWidth) / 2;
      pdf.text(title, xOffset, 20);

      // Add the image of the report content
      pdf.addImage(imgData, "PNG", 4, 30, 200, 0);

      // Add signature and name at the bottom
      pdf.setFontSize(12);
      pdf.text("_ _ _ _ _ _ _ _ _ _ _ _ _ _ _", 10, 190);
      pdf.text("Signature of Sales Manager", 10, 200);
      pdf.text("Y.L.Jayasinghe", 10, 210);

      // Save the PDF with a name including the current date
      pdf.save(`sales_report_${new Date().toLocaleDateString()}.pdf`);

      // Show the element again after capturing
      if (elementToIgnore) {
        elementToIgnore.style.display = "";
      }
    });
  };

  // Prepare chart data for sales graph (Hourly sales)
  const hourlySalesChartData = {
    labels: [...Array(24).keys()].map((hour) => `Hour ${hour}`),
    datasets: [
      {
        label: "Sales per Hour",
        data: salesData,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
      },
    ],
  };

  // Prepare chart data for item sales graph
  const itemSalesChartData = {
    labels: itemSalesData.map((item) => item.item_name),
    datasets: [
      {
        label: "Sales per Item",
        data: itemSalesData.map((item) => item.soldCount),
        borderColor: "rgba(153, 102, 255, 1.0)",
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true, // Ensures values start from 0
        ticks: {
          stepSize: 1, // Forces full integer steps
          callback: function (value) {
            if (value % 1 === 0 && value >= 0) {
              // Shows only positive integers
              return value;
            }
          },
        },
        min: 0,
      },
    },
  };

  return (
    <div className="p-4 md:mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
        <a
          href="/aibot"
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          {" "}
          <span className="text-sm">Get AI Assistant for Your Business</span>
          <img
            src="https://platform.ionic.io/icons/chatbots.jpeg"
            alt="AI Assistant"
            style={{ width: "50px", height: "50px", marginRight: "10px" }}
          />
        </a>
      </div>
      <div className="pt-4"></div>
      <div id="reportContent">
        <div className="flex flex-row gap-10 max-w-screen justify-evenly items-start p-10 m-10">
          {/* Hourly Sales for Current Day */}
          <div className="flex flex-col p-3 gap-4 md:w-96 w-full rounded-md shadow-md">
            <div className="flex justify-between">
              <div>
                <h3 className="text-gray-500 text-md uppercase">
                  Hourly Sales (for Upcoming Day)
                </h3>
              </div>
            </div>
            <div className="flex">
              <Line data={hourlySalesChartData} options={chartOptions} />
            </div>
            <div className="flex gap-2 text-sm">
              <div className="text-gray-500">Most Sales Hour:</div>
              <span className="text-green-500 flex items-center">
                {mostSalesHour}
              </span>
            </div>
            <div className="flex gap-2 text-sm">
              <div className="text-gray-500">Least Sales Hour:</div>
              <span className="text-red-500 flex items-center">
                {leastSalesHour}
              </span>
            </div>
          </div>

          <div className="px-4"></div>
          {/* Items with their Sales for Current Day */}
          <div className="flex flex-col p-3 gap-4 md:w-96 w-full rounded-md shadow-md">
            <div className="flex justify-between">
              <div>
                <h3 className="text-gray-500 text-md uppercase">
                  Items with Sales (for Upcoming Day)
                </h3>
              </div>
            </div>
            <div className="flex">
              <Bar data={itemSalesChartData} options={chartOptions} />
            </div>
            <div className="flex flex-row">
              <div className="text-gray-500">Most Sold Item:</div>
              {mostSoldItems.length > 0 ? (
                mostSoldItems.map((mostSoldItem) => (
                  <div
                    key={mostSoldItem.item_id}
                    className="flex gap-2 text-sm"
                    style={{ paddingLeft: "1rem" }}
                  >
                    <span className="text-green-500 flex items-center">
                      {mostSoldItem.item_name} ({mostSoldItem.soldCount} sales),
                    </span>
                  </div>
                ))
              ) : (
                <div>No most sold items found.</div> // Fallback message if array is empty
              )}
            </div>

            <div className="flex flex-row">
              <div className="text-gray-500">Least Sold Item:</div>
              {leastSoldItems.length > 0 ? (
                leastSoldItems.map((leastSoldItem) => (
                  <div
                    key={leastSoldItem.item_id}
                    className="flex gap-2 text-sm"
                    style={{ paddingLeft: "1rem" }}
                  >
                    <span className="text-red-500 flex items-center">
                      {leastSoldItem.item_name} ({leastSoldItem.soldCount}{" "}
                      sales),
                    </span>
                  </div>
                ))
              ) : (
                <div>No least sold items found.</div> // This ensures something is displayed if the array is empty
              )}
            </div>
          </div>
        </div>

        <div className="pt-4"></div>
        <div className="pt-4"></div>
        <div className="flex flex-row gap-10 justify-evenly items-start p-10 m-10">
          <div className="pl-4"></div>
          {/* Current Day's Discounting Hours */}
          <div className="flex flex-row p-10 pr-4 justify-between items-start md:w-96 w-full rounded-md shadow-md">
            <div className="flex flex-col p-3 gap-4 justify-center">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-gray-500 text-md uppercase">
                    Discounting Hours (Current Day)
                  </h3>
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <div className="text-gray-500">Discounting Hours:</div>
                <span className="text-green-500 flex items-center">
                  {!discountHours || discountHours.length < 2 ? (
                    <>
                      <div>Most: Data not available</div>
                      <div className="ml-4 text-red-500">
                        Least: Data not available
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        Most:{" "}
                        {(discountHours[0] || "Data not available")
                          .toString()
                          .padStart(2, "0")}
                        {discountHours[0] ? ":00" : ""}
                      </div>
                      <div className="ml-4 text-red-500">
                        Least:{" "}
                        {(discountHours[1] || "Data not available")
                          .toString()
                          .padStart(2, "0")}
                        {discountHours[1] ? ":00" : ""}
                      </div>
                    </>
                  )}
                </span>
              </div>
              <br />
              <br />
              <br />
              <br />
              <div id="elementToIgnore" className="flex gap-2 text-sm">
                <Link to={"/home"}>
                  <button
                    onClick={() => handleDiscountNow("hour")}
                    disabled={isDisabled} // Disable the button based on state
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "1rem",
                      borderRadius: "0.375rem",
                      color: isDisabled
                        ? "#A0A0A0"
                        : "linear-gradient(90deg, #EC4899, #FFB037)",
                      background: "transparent",
                      border: isDisabled
                        ? "1px solid #A0A0A0"
                        : "1px solid #EC4899",
                      outline: "none",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled) {
                        e.target.style.background =
                          "linear-gradient(90deg, #EC4899, #FFB037)";
                        e.target.style.color = "white";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDisabled) {
                        e.target.style.background = "transparent";
                        e.target.style.color = "black";
                      }
                    }}
                  >
                    {isDisabled
                      ? "Discount Active for an Hour"
                      : "Apply Discount Now"}
                  </button>
                </Link>
              </div>
            </div>
            <div>
              <img
                src="https://cdn-icons-png.flaticon.com/512/4279/4279552.png"
                alt="product"
                style={{ width: "8cm", height: "8cm" }}
                className="p-4"
              />
            </div>
          </div>

          <div className="px-4"></div>
          {/* Current Day's Discounting Items */}
          <div className="flex flex-col p-3 gap-4 md:w-96 w-full rounded-md shadow-md">
            <div className="flex justify-between">
              <div>
                <h3 className="text-gray-500 text-md uppercase">
                  Discounting Items (Current Day)
                </h3>
              </div>
            </div>
            <div className="flex">
              <table
                className="shadow-md"
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#F3F4F6" }}>
                    <th style={{ padding: "12px" }}>Item Name</th>
                    <th style={{ padding: "12px" }}>Sales</th>
                    <th style={{ padding: "12px" }}>Discount</th>
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: "grey" }}>
                  {discountItems.length > 0 ? (
                    discountItems.map((item) => (
                      <tr
                        style={{ backgroundColor: "#FFFFFF" }}
                        key={item.item_id}
                      >
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: "bold",
                            color: "#4B5563",
                            textAlign: "center",
                          }}
                        >
                          {item.item_name}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: "bold",
                            color: "#4B5563",
                            textAlign: "center",
                          }}
                        >
                          {item.soldCount}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: "bold",
                            color: "#4B5563",
                            textAlign: "center",
                          }}
                        >
                          {item.discount_precentage}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ backgroundColor: "#FFFFFF" }}>
                      <td
                        style={{
                          padding: "12px",
                          fontWeight: "bold",
                          color: "#4B5563",
                          textAlign: "center",
                        }}
                        colSpan={3} // Merging all columns for a unified message
                      >
                        No data available for discount items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-red-500 mt-8">{message}</p>}
      {/* Generate Report Button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleManageProductsClick} // Add onClick to handle navigation
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          style={{ marginRight: "10px" }}
        >
          Manage Products
        </button>
        <button
          onClick={generatePDF}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Generate Report
        </button>
      </div>
      <div className="py-4"></div>
    </div>
  );
};

export default Dashboard;
