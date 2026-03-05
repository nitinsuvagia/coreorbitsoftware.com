'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Landmark, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BankDetailsData {
  accountNumber: string;
  confirmAccountNumber: string;
  bankName: string;
  ifscCode: string;
  branchName: string;
  accountHolderName: string;
  accountType: string;
}

interface BankDetailsStepProps {
  data: BankDetailsData;
  onChange: (data: BankDetailsData) => void;
}

const ACCOUNT_TYPES = ['Savings', 'Current'];

const POPULAR_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'IndusInd Bank',
  'Yes Bank',
  'Union Bank of India',
  'IDFC First Bank',
  'Federal Bank',
  'Bank of India',
  'Other',
];

export default function BankDetailsStep({ data, onChange }: BankDetailsStepProps) {
  const [ifscError, setIfscError] = useState<string | null>(null);
  const [isVerifyingIfsc, setIsVerifyingIfsc] = useState(false);
  const [ifscVerified, setIfscVerified] = useState(false);

  const handleChange = (field: keyof BankDetailsData, value: string) => {
    onChange({ ...data, [field]: value });
    
    // Reset IFSC verification when IFSC changes
    if (field === 'ifscCode') {
      setIfscVerified(false);
      setIfscError(null);
    }
  };

  const accountsMatch = data.accountNumber && data.confirmAccountNumber && 
    data.accountNumber === data.confirmAccountNumber;
  
  const accountsDontMatch = data.accountNumber && data.confirmAccountNumber && 
    data.accountNumber !== data.confirmAccountNumber;

  // Verify IFSC code
  const verifyIfsc = async () => {
    if (!data.ifscCode || data.ifscCode.length !== 11) {
      setIfscError('IFSC code must be 11 characters');
      return;
    }

    setIsVerifyingIfsc(true);
    setIfscError(null);

    try {
      // Try to fetch bank details from IFSC
      const response = await fetch(`https://ifsc.razorpay.com/${data.ifscCode}`);
      
      if (response.ok) {
        const bankData = await response.json();
        // Auto-fill bank name and branch
        onChange({
          ...data,
          bankName: bankData.BANK || data.bankName,
          branchName: bankData.BRANCH || data.branchName,
        });
        setIfscVerified(true);
      } else {
        setIfscError('Invalid IFSC code');
      }
    } catch (error) {
      // If API fails, just validate format
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (ifscRegex.test(data.ifscCode.toUpperCase())) {
        setIfscVerified(true);
      } else {
        setIfscError('Invalid IFSC format');
      }
    } finally {
      setIsVerifyingIfsc(false);
    }
  };

  // Auto-verify IFSC when it reaches 11 characters
  useEffect(() => {
    if (data.ifscCode?.length === 11) {
      verifyIfsc();
    }
  }, [data.ifscCode]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Landmark className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Salary Account Details</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Please provide your bank account details for salary credit. Ensure the account is in your name.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="accountHolderName">Account Holder Name <span className="text-red-500">*</span></Label>
          <Input
            id="accountHolderName"
            value={data.accountHolderName}
            onChange={(e) => handleChange('accountHolderName', e.target.value.toUpperCase())}
            placeholder="Name as per bank records"
            required
          />
          <p className="text-xs text-muted-foreground">Enter name exactly as it appears in your bank account</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number <span className="text-red-500">*</span></Label>
            <Input
              id="accountNumber"
              type="password"
              value={data.accountNumber}
              onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="Enter account number"
              maxLength={18}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmAccountNumber">
              Confirm Account Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmAccountNumber"
                value={data.confirmAccountNumber}
                onChange={(e) => handleChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter account number"
                maxLength={18}
                className={accountsDontMatch ? 'border-red-500 pr-10' : accountsMatch ? 'border-green-500 pr-10' : ''}
                required
              />
              {accountsMatch && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
              )}
              {accountsDontMatch && (
                <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
              )}
            </div>
            {accountsDontMatch && (
              <p className="text-xs text-red-500">Account numbers do not match</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ifscCode">IFSC Code <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                id="ifscCode"
                value={data.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g., HDFC0001234"
                maxLength={11}
                className={ifscError ? 'border-red-500 pr-10' : ifscVerified ? 'border-green-500 pr-10' : ''}
                required
              />
              {ifscVerified && (
                <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
              )}
              {ifscError && (
                <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
              )}
            </div>
            {ifscError && <p className="text-xs text-red-500">{ifscError}</p>}
            {ifscVerified && <p className="text-xs text-green-600">IFSC code verified</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type <span className="text-red-500">*</span></Label>
            <Select value={data.accountType} onValueChange={(value) => handleChange('accountType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name <span className="text-red-500">*</span></Label>
            <Select value={data.bankName} onValueChange={(value) => handleChange('bankName', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchName">Branch Name <span className="text-red-500">*</span></Label>
            <Input
              id="branchName"
              value={data.branchName}
              onChange={(e) => handleChange('branchName', e.target.value)}
              placeholder="e.g., New York Main Branch"
              required
            />
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
        <p className="text-amber-800 dark:text-amber-200">
          <strong>Important:</strong> Please provide a cancelled cheque or bank statement in the Documents section 
          for verification of bank details.
        </p>
      </div>
    </div>
  );
}
