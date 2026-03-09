import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllProducts } from "../lib/api/products";


const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";

export const ProductBlock = () => {
  const { data: allProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getAllProducts,
  });

  return (
    <>
      <div className="text-end ">
        <Link
          className="bg-blue-300 px-5 py-2 rounded-md text-lg font-semibold"
          to={"/administrator/dashboard/product/add"}
        >
          + Add Products
        </Link>
      </div>
      <div className="overflow-x-auto mt-20">
        <table className="table w-full table-zebra">
          <thead className="bg-base-200">
            <tr>
              <th>#</th>
              <th>Image</th>
              <th>Product Name</th>
              <th>Description</th>
              <th>MRP</th>
              <th>Offer (%)</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allProducts?.result?.map((product, index) => (
              <tr key={product.id}>
                <td>{product.productId || "-"}</td>
                <td>
                  <img
                    src={
                      product.image?.startsWith("http")
                        ? product.image
                        : product.image?.includes("uploads/")
                          ? `${BASE_URL}${product.image.startsWith("/") ? "" : "/"}${product.image}`
                          : `${BASE_URL}/uploads/${product.image}`
                    }
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/100x100?text=No+Image";
                    }}
                  />
                </td>
                <td>{product.name}</td>
                <td>{product.description || "-"}</td>
                <td>₹{product.mrp}</td>
                <td>{product.offer || 0}%</td>
                <td>₹{product.amount}</td>
                <td>{product.status}</td>
                <td>
                  <Link
                    to={`/administrator/dashboard/product/edit/${product.id}`}
                    className="btn btn-sm btn-outline btn-info"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!allProducts?.result?.length && (
              <tr>
                <td colSpan="9" className="text-center">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div >
    </>
  );
};
