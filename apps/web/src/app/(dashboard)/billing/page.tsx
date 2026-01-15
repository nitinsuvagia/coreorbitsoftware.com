'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Check,
  ArrowUpRight,
  Download,
  Users,
  HardDrive,
  Zap,
  Receipt,
} from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'For small teams getting started',
    features: ['Up to 25 employees', '5 GB storage', 'Basic reports', 'Email support'],
    popular: false,
  },
  {
    name: 'Professional',
    price: 79,
    description: 'For growing organizations',
    features: ['Up to 100 employees', '50 GB storage', 'Advanced reports', 'Priority support', 'API access'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 199,
    description: 'For large enterprises',
    features: ['Unlimited employees', '500 GB storage', 'Custom reports', '24/7 support', 'SSO & SAML', 'Dedicated account manager'],
    popular: false,
  },
];

const invoices = [
  { id: 'INV-001', date: '2024-03-01', amount: 79, status: 'paid' },
  { id: 'INV-002', date: '2024-02-01', amount: 79, status: 'paid' },
  { id: 'INV-003', date: '2024-01-01', amount: 79, status: 'paid' },
  { id: 'INV-004', date: '2023-12-01', amount: 79, status: 'paid' },
];

export default function BillingPage() {
  const currentPlan = 'Professional';
  const usageData = {
    employees: { used: 45, limit: 100 },
    storage: { used: 12.5, limit: 50 },
    apiCalls: { used: 8500, limit: 50000 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>
        <Button variant="outline" size="icon" title="Download PDF">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="subscription" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment">Payment Method</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>You are currently on the Professional plan</CardDescription>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">$79</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Next billing date: April 1, 2024
              </p>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline">Cancel Subscription</Button>
              <Button variant="outline">Change Plan</Button>
            </CardFooter>
          </Card>

          {/* Available Plans */}
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? 'border-primary shadow-lg' : ''}
              >
                {plan.popular && (
                  <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.name === currentPlan ? 'outline' : 'default'}
                    disabled={plan.name === currentPlan}
                  >
                    {plan.name === currentPlan ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Employees</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {usageData.employees.used} / {usageData.employees.limit}
                      </h3>
                    </div>
                    <Progress
                      value={(usageData.employees.used / usageData.employees.limit) * 100}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {usageData.employees.limit - usageData.employees.used} employees remaining
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Storage</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {usageData.storage.used} GB / {usageData.storage.limit} GB
                      </h3>
                    </div>
                    <Progress
                      value={(usageData.storage.used / usageData.storage.limit) * 100}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {(usageData.storage.limit - usageData.storage.used).toFixed(1)} GB remaining
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <HardDrive className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">API Calls</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <h3 className="text-3xl font-bold">
                        {(usageData.apiCalls.used / 1000).toFixed(1)}k / {usageData.apiCalls.limit / 1000}k
                      </h3>
                    </div>
                    <Progress
                      value={(usageData.apiCalls.used / usageData.apiCalls.limit) * 100}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {((usageData.apiCalls.limit - usageData.apiCalls.used) / 1000).toFixed(1)}k calls remaining
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Zap className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>Your usage trends over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ArrowUpRight className="h-12 w-12 mx-auto mb-2" />
                <p>Usage chart visualization</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>View and download your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Invoice</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invoice.id}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="p-3 font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="p-3">
                        <Badge variant="success">{invoice.status}</Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Method Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>Default</Badge>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">
                <CreditCard className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
              <CardDescription>Your billing address for invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">TechCorp Inc</p>
                <p className="text-muted-foreground">123 Business Ave</p>
                <p className="text-muted-foreground">San Francisco, CA 94102</p>
                <p className="text-muted-foreground">United States</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Update Address</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
