import { useState } from 'react';
import { motion } from 'motion/react';
import { IdCard, CheckCircle, AlertCircle, Warehouse } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';

interface EmployeeVerificationProps {
  onVerified: () => void;
  employeeName: string;
}

interface EmployeeData {
  id: string;
  name: string;
  department: string;
  role: string;
}

const mockEmployees: Record<string, EmployeeData> = {
  'EMP001': {
    id: 'EMP001',
    name: 'John Doe',
    department: 'Warehouse Operations',
    role: 'Warehouse Manager',
  },
  'EMP002': {
    id: 'EMP002',
    name: 'Jane Smith',
    department: 'Warehouse Operations',
    role: 'Warehouse Staff',
  },
  'EMP003': {
    id: 'EMP003',
    name: 'Mike Johnson',
    department: 'Production',
    role: 'Production Supervisor',
  },
};

export function EmployeeVerification({ onVerified, employeeName }: EmployeeVerificationProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleScan = (code: string) => {
    setIsVerifying(true);
    
    // Simulate verification delay
    setTimeout(() => {
      const empData = mockEmployees[code];
      if (empData) {
        setEmployee(empData);
        setError(false);
        
        // Auto-proceed after showing success
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setEmployee(null);
        setError(true);
      }
      setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a52] to-[#2d5f73] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="mb-6">
            <div className="inline-flex items-center justify-center bg-white rounded-3xl p-4 shadow-2xl">
              <Warehouse className="w-16 h-16 text-[#2d5f73]" />
            </div>
          </div>
          <h1 className="text-white mb-2">Employee Verification</h1>
          <p className="text-white/90">Welcome, {employeeName}</p>
          <p className="text-white/80 mt-2">Please scan your employee ID to continue</p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          <label className="block text-gray-700 mb-4">Scan Employee ID</label>
          <BarcodeScanner 
            onScan={handleScan} 
            placeholder="Scan your ID badge (e.g., EMP001)"
          />
          
          <div className="mt-4">
            <p className="text-gray-500">Try: EMP001, EMP002, or EMP003</p>
          </div>

          {isVerifying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center"
            >
              <div className="inline-block w-8 h-8 border-4 border-[#ff3131] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-3">Verifying...</p>
            </motion.div>
          )}

          {error && !isVerifying && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-red-900">Verification Failed</div>
                <p className="text-red-700">Employee ID not found. Please try again.</p>
              </div>
            </motion.div>
          )}

          {employee && !isVerifying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 bg-green-50 border-l-4 border-green-500 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-green-900 mb-3">Verification Successful!</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-700">Name:</span>
                      <span className="text-green-900">{employee.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">ID:</span>
                      <span className="text-green-900">{employee.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Department:</span>
                      <span className="text-green-900">{employee.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Role:</span>
                      <span className="text-green-900">{employee.role}</span>
                    </div>
                  </div>
                  <p className="text-green-600 mt-3">Redirecting to dashboard...</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}