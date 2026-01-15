import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import NewEmployeePage from './page';
import {
  useDepartments,
  useDesignations,
  useEmployees,
} from '@/hooks/use-employees';

jest.mock('@/hooks/use-employees', () => ({
  useDepartments: jest.fn(),
  useDesignations: jest.fn(),
  useEmployees: jest.fn(),
}));

jest.mock('@/components/ui/tabs', () => {
  const React = require('react');
  const TabsContext = React.createContext({
    value: '',
    onValueChange: () => undefined,
  });

  const Tabs = ({ value, onValueChange, children }: any) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
  const TabsList = ({ children }: any) => <div>{children}</div>;
  const TabsTrigger = ({ value, children, ...props }: any) => {
    const ctx = React.useContext(TabsContext);
    return (
      <button
        type="button"
        role="tab"
        aria-selected={ctx.value === value}
        onClick={() => ctx.onValueChange?.(value)}
        {...props}
      >
        {children}
      </button>
    );
  };
  const TabsContent = ({ value, children }: any) => {
    const ctx = React.useContext(TabsContext);
    if (ctx.value && ctx.value !== value) {
      return null;
    }
    return <div>{children}</div>;
  };

  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

jest.mock('@/components/ui/select', () => {
  const React = require('react');
  const SelectContext = React.createContext({
    value: '',
    onValueChange: () => undefined,
  });

  const Select = ({ value, onValueChange, children }: any) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );
  const SelectTrigger = ({ children, ...props }: any) => (
    <button type="button" role="combobox" {...props}>
      {children}
    </button>
  );
  const SelectValue = ({ placeholder }: { placeholder?: string }) => {
    const ctx = React.useContext(SelectContext);
    return <span>{ctx.value || placeholder}</span>;
  };
  const SelectContent = ({ children }: any) => <div>{children}</div>;
  const SelectItem = ({ value, children }: any) => {
    const ctx = React.useContext(SelectContext);
    return (
      <div
        role="option"
        aria-selected={ctx.value === value}
        onClick={() => ctx.onValueChange?.(value)}
      >
        {children}
      </div>
    );
  };

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockedUseDepartments = useDepartments as jest.Mock;
const mockedUseDesignations = useDesignations as jest.Mock;
const mockedUseEmployees = useEmployees as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedToast = toast as { success: jest.Mock; error: jest.Mock };
const originalFetch = global.fetch;
let mockPush: jest.Mock;

const baseMocks = () => {
  mockedUseDepartments.mockReturnValue({
    data: [{ id: 'dept-1', name: 'Engineering' }],
  });
  mockedUseDesignations.mockReturnValue({
    data: [
      { id: 'des-1', name: 'Software Engineer', level: 1 },
      { id: 'des-2', name: 'QA Engineer', level: 2 },
    ],
  });
  mockedUseEmployees.mockReturnValue({
    data: { items: [] },
  });
};

describe('NewEmployeePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush = jest.fn();
    mockedUseRouter.mockReturnValue({ push: mockPush });
    baseMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const openSelectByLabel = async (
    user: ReturnType<typeof userEvent.setup>,
    labelMatcher: RegExp
  ) => {
    const label = screen.getByText(labelMatcher, { selector: 'label' });
    const field = label.closest('div');
    const trigger = field?.querySelector('[role="combobox"]');
    if (!trigger) {
      throw new Error(`Missing combobox for ${labelMatcher}`);
    }
    await user.click(trigger as HTMLElement);
  };

  it('shows designation options from the API', async () => {
    const user = userEvent.setup();

    render(<NewEmployeePage />);

    await user.click(screen.getByRole('tab', { name: /employment/i }));
    await openSelectByLabel(user, /^designation/i);

    expect(await screen.findByText(/software engineer/i)).toBeInTheDocument();
  });

  it('auto-fills address fields from geolocation', async () => {
    const user = userEvent.setup();

    const geolocationMock = {
      getCurrentPosition: jest.fn().mockImplementation((success) =>
        success({
          coords: { latitude: 51.5237, longitude: -0.1585 },
        })
      ),
    };

    Object.defineProperty(global.navigator, 'geolocation', {
      value: geolocationMock,
      configurable: true,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {
          house_number: '221B',
          road: 'Baker Street',
          city: 'London',
          state: 'Greater London',
          country: 'United Kingdom',
          postcode: 'NW1',
        },
      }),
    }) as unknown as typeof fetch;

    render(<NewEmployeePage />);

    await user.click(screen.getByRole('tab', { name: /address/i }));
    await user.click(screen.getByRole('button', { name: /auto-fill address/i }));

    expect(geolocationMock.getCurrentPosition).toHaveBeenCalled();
    expect(await screen.findByDisplayValue('221B Baker Street')).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toHaveValue('London');
    expect(screen.getByLabelText(/state\/province/i)).toHaveValue('Greater London');
    expect(screen.getByLabelText(/country/i)).toHaveValue('United Kingdom');
    expect(screen.getByLabelText(/postal code/i)).toHaveValue('NW1');
  });

  it('shows required field errors on submit', async () => {
    const user = userEvent.setup();

    render(<NewEmployeePage />);

    await user.click(screen.getByRole('button', { name: /create employee/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('submits valid data and navigates on success', async () => {
    const user = userEvent.setup();

    mockedApiClient.post.mockResolvedValue({
      success: true,
      data: { id: 'emp-1' },
    });

    render(<NewEmployeePage />);

    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/work email/i), 'jane.doe@acme.com');

    await user.click(screen.getByRole('tab', { name: /employment/i }));

    await openSelectByLabel(user, /department/i);
    await user.click(await screen.findByText(/engineering/i));

    await openSelectByLabel(user, /designation/i);
    await user.click(await screen.findByText(/software engineer/i));

    await user.type(screen.getByLabelText(/join date/i), '2024-01-15');

    await user.click(screen.getByRole('button', { name: /create employee/i }));

    await waitFor(() => expect(mockedApiClient.post).toHaveBeenCalled());
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/api/v1/employees',
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@acme.com',
        departmentId: 'dept-1',
        designationId: 'des-1',
        joinDate: '2024-01-15',
      })
    );
    expect(mockedToast.success).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/employees');
  });
});
