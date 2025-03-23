"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  collectionGroup,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { formatEther } from "viem";
import { CryptoPayoutButton } from "@/components/CryptoPayoutButton";
import CryptoDonation from "@/components/ngo/CryptoDonation";

export function CryptoDonationTable({ ngoProfile: propNgoProfile, userId: propUserId }) {
  const [userData, setUserData] = useState(null);
  const [ngoId, setNgoId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [cryptoDonations, setCryptoDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get user data and ngoId on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("User not authenticated");
        }

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (!userDoc.exists()) {
          throw new Error("User data not found");
        }

        const data = userDoc.data();
        
        // Fetch NGO profile for additional data
        let ngoProfile = propNgoProfile; // Use prop if available
        let ngoIdToUse = propUserId;     // Use prop if available

        if (!ngoProfile) {
          if (data.type === "ngo") {
            ngoIdToUse = data.role === "admin" ? currentUser.uid : data.ngoId;
            if (ngoIdToUse) {
              const ngoDoc = await getDoc(doc(db, "ngo", ngoIdToUse));
              if (ngoDoc.exists()) {
                ngoProfile = ngoDoc.data();
                setUserData({...data, ...ngoProfile});
              } else {
                setUserData(data);
              }
            } else {
              setUserData(data);
            }
            ngoIdToUse = currentUser.uid;
          } else {
            setUserData(data);
            ngoIdToUse = currentUser.uid;
          }
        } else {
          setUserData({...data, ...ngoProfile});
        }
        
        setNgoId(ngoIdToUse || currentUser.uid);

        // Now that we have user data, set up the donation listeners
        setupDonationListeners(ngoIdToUse || currentUser.uid);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [propNgoProfile, propUserId]);

  // Set up donation listeners with the appropriate NGO ID
  const setupDonationListeners = useCallback((ngoId) => {
    if (!ngoId) {
      setLoading(false);
      return;
    }

    const currentYear = new Date().getFullYear().toString();
    
    // Fetch crypto donations using collectionGroup
    const unsubscribe = onSnapshot(
      collectionGroup(db, "crypto"),
      (snapshot) => {
        const donations = [];
        
        snapshot.forEach((doc) => {
          // Only include donations that belong to this NGO and year
          const path = doc.ref.path;
          if (path.includes(`donations/${ngoId}/${currentYear}`)) {
            const data = doc.data();
            console.log("Crypto donation data:", data);  // Debug log
            console.log("Crypto amount:", data.cryptoAmount, "Type:", data.cryptoType);  // Debug log
            
            donations.push({
              id: doc.id,
              donor: data.name || data.donorName || data.senderAddress?.substring(0, 8) + "..." || "Anonymous",
              email: data.email || data.donorEmail || "N/A",
              amount: data.amount || "N/A",
              txHash: data.txHash || "N/A",
              date: data.timestamp ? new Date(data.timestamp).toLocaleString() : 
                    (data.donatedOn ? new Date(data.donatedOn).toLocaleString() : "N/A"),
              status: data.status || "Completed",
              senderAddress: data.senderAddress || "N/A",
              timestamp: data.timestamp ? new Date(data.timestamp).getTime() : 
                        (data.donatedOn ? new Date(data.donatedOn).getTime() : 0),
              rawData: data,
              type: "Crypto",
              phone: data.phone || data.donorPhone || "N/A",
            });
          }
        });

        // Sort donations by timestamp (newest first)
        const sortedDonations = donations.sort((a, b) => b.timestamp - a.timestamp);
        setCryptoDonations(sortedDonations);
        setLoading(false);
      },
      (error) => {
        console.error("Error in crypto donation listener:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Calculate donation counts by status
  const donationCounts = {
    total: cryptoDonations.length,
    completed: cryptoDonations.filter(d => d.status === "Completed").length,
    pending: cryptoDonations.filter(d => d.status === "Pending").length,
    rejected: cryptoDonations.filter(d => d.status === "Rejected").length,
  };

  // Filter donations based on search term
  const filteredDonations = cryptoDonations.filter(
    (donation) =>
      (statusFilter === "All" || donation.status === statusFilter) &&
      (donation.donor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.amount?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.txHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.senderAddress?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openViewModal = (transaction) => {
    setSelectedTransaction(transaction);
    setViewOpen(true);
  };

  const deleteTransaction = (id) => {
    console.log("Deleting transaction:", id);
    // Implementation would go here
    toast.error("Delete functionality not implemented yet");
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Cryptocurrency Donations</CardTitle>
          <CardDescription>
            View all cryptocurrency donation records here, sorted by most recent first, updates in real-time.
          </CardDescription>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <CryptoDonation />
          {(ngoId || propUserId) && (
            <CryptoPayoutButton 
              ngoProfile={propNgoProfile || userData} 
              userId={propUserId || auth.currentUser?.uid} 
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loading && cryptoDonations.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-100 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-semibold">{donationCounts.total}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-600">Completed</p>
              <p className="text-2xl font-semibold">
                {donationCounts.completed}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-600">Pending</p>
              <p className="text-2xl font-semibold">{donationCounts.pending}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-600">Rejected</p>
              <p className="text-2xl font-semibold">
                {donationCounts.rejected}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search donors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading crypto donations...</div>
        ) : cryptoDonations.length === 0 ? (
          <div className="text-center py-4">
            No cryptocurrency donations found.
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="text-center py-4">
            No donations match your filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDonations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>{donation.donor}</TableCell>
                  <TableCell>{donation.email}</TableCell>
                  <TableCell>{donation.amount}</TableCell>
                  <TableCell className="truncate max-w-[120px]">
                    {donation.txHash?.substring(0, 10) || "N/A"}
                    {donation.txHash ? "..." : ""}
                  </TableCell>
                  <TableCell>{donation.date}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        donation.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : donation.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : donation.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {donation.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openViewModal(donation)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteTransaction(donation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* View Transaction Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Donation Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Donor</p>
                  <p className="mt-1">{selectedTransaction.donor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{selectedTransaction.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="mt-1">
                    <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                      Crypto
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="mt-1">{selectedTransaction.date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        selectedTransaction.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : selectedTransaction.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedTransaction.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedTransaction.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="mt-1">{selectedTransaction.amount || "N/A"}</p>
                </div>
              </div>
              
              {selectedTransaction.txHash && selectedTransaction.txHash !== "N/A" && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Transaction Hash</p>
                  <p className="mt-1 break-all text-xs">{selectedTransaction.txHash}</p>
                </div>
              )}
              
              {selectedTransaction.senderAddress && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Sender Address</p>
                  <p className="mt-1 break-all text-xs">{selectedTransaction.senderAddress}</p>
                </div>
              )}
              
              {selectedTransaction.phone && selectedTransaction.phone !== "N/A" && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1">{selectedTransaction.phone}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 