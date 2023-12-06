import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import configureMockStore from 'redux-mock-store';
import dayjs from 'dayjs';
import {
  screen,
  render,
} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { IntlProvider } from '@edx/frontend-platform/i18n';
import BudgetCard from '../BudgetCard';
import { formatPrice, useSubsidySummaryAnalyticsApi, useBudgetRedemptions } from '../data';
import { BUDGET_TYPES } from '../../EnterpriseApp/data/constants';
import { EnterpriseSubsidiesContext } from '../../EnterpriseSubsidiesContext';

jest.mock('../data', () => ({
  ...jest.requireActual('../data'),
  useSubsidySummaryAnalyticsApi: jest.fn(),
  useBudgetRedemptions: jest.fn(),
}));
useSubsidySummaryAnalyticsApi.mockReturnValue({
  isLoading: false,
  offerSummary: null,
});
useBudgetRedemptions.mockReturnValue({
  isLoading: false,
  offerRedemptions: {
    itemCount: 0,
    pageCount: 0,
    results: [],
  },
  fetchBudgetRedemptions: jest.fn(),
});

const mockStore = configureMockStore([thunk]);
const getMockStore = store => mockStore(store);
const enterpriseSlug = 'test-enterprise';
const enterpriseUUID = '1234';
const initialStore = {
  portalConfiguration: {
    enterpriseId: enterpriseUUID,
    enterpriseSlug,
  },
};
const store = getMockStore({ ...initialStore });

const mockEnterpriseOfferId = 123;
const mockBudgetUuid = 'test-budget-uuid';

const mockBudgetDisplayName = 'Test Enterprise Budget Display Name';

const defaultEnterpriseSubsidiesContextValue = {
  isFetchingBudgets: false,
};

const BudgetCardWrapper = ({
  enterpriseSubsidiesContextValue = defaultEnterpriseSubsidiesContextValue,
  ...rest
}) => (
  <MemoryRouter initialEntries={['/test-enterprise/admin/learner-credit']}>
    <Provider store={store}>
      <IntlProvider locale="en">
        <EnterpriseSubsidiesContext.Provider value={enterpriseSubsidiesContextValue}>
          <BudgetCard {...rest} />
        </EnterpriseSubsidiesContext.Provider>
      </IntlProvider>
    </Provider>
  </MemoryRouter>
);

describe('<BudgetCard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays correctly for Enterprise Offers (ecommerce)', () => {
    const mockBudget = {
      id: mockEnterpriseOfferId,
      name: mockBudgetDisplayName,
      start: '2022-01-01',
      end: '2023-01-01',
      source: BUDGET_TYPES.ecommerce,
    };
    const mockBudgetAggregates = {
      total: 5000,
      spent: 200,
      available: 4800,
    };
    useSubsidySummaryAnalyticsApi.mockReturnValue({
      isLoading: false,
      subsidySummary: {
        totalFunds: mockBudgetAggregates.total,
        redeemedFunds: mockBudgetAggregates.spent,
        remainingFunds: mockBudgetAggregates.available,
        percentUtilized: mockBudgetAggregates.spent / mockBudgetAggregates.total,
        offerType: 'Site',
        offerId: mockEnterpriseOfferId,
        budgetsSummary: [],
      },
    });

    render(<BudgetCardWrapper
      budget={mockBudget}
      enterpriseUUID={enterpriseUUID}
      enterpriseSlug={enterpriseSlug}
    />);

    expect(screen.getByText(mockBudgetDisplayName)).toBeInTheDocument();
    expect(screen.queryByText('Executive Education')).not.toBeInTheDocument();
    const formattedString = `Expired ${dayjs(mockBudget.end).format('MMMM D, YYYY')}`;
    const elementsWithTestId = screen.getAllByTestId('budget-date');
    const firstElementWithTestId = elementsWithTestId[0];
    expect(firstElementWithTestId).toHaveTextContent(formattedString);

    // View budget CTA
    const viewBudgetCTA = screen.getByText('View budget', { selector: 'a' });
    expect(viewBudgetCTA).toBeInTheDocument();
    expect(viewBudgetCTA).toHaveAttribute('href', `/${enterpriseSlug}/admin/learner-credit/${mockEnterpriseOfferId}`);

    // Aggregates
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(mockBudgetAggregates.available))).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(mockBudgetAggregates.spent))).toBeInTheDocument();
  });

  it('displays correctly for Subsidy (enterprise-subsidy)', () => {
    const mockBudget = {
      id: mockEnterpriseOfferId,
      name: mockBudgetDisplayName,
      start: '2022-01-01',
      end: '2023-01-01',
      source: BUDGET_TYPES.subsidy,
    };
    const mockBudgetAggregates = {
      total: 5000,
      spent: 200,
      available: 4800,
    };
    useSubsidySummaryAnalyticsApi.mockReturnValue({
      isLoading: false,
      subsidySummary: {
        totalFunds: mockBudgetAggregates.total,
        redeemedFunds: mockBudgetAggregates.spent,
        remainingFunds: mockBudgetAggregates.available,
        percentUtilized: mockBudgetAggregates.spent / mockBudgetAggregates.total,
        offerType: 'Site',
        offerId: mockEnterpriseOfferId,
        budgetsSummary: [
          {
            id: 'test-subsidy-uuid',
            start: '2022-01-01',
            end: '2022-01-01',
            remainingFunds: mockBudgetAggregates.available,
            redeemedFunds: mockBudgetAggregates.spent,
            enterpriseSlug,
            subsidyAccessPolicyDisplayName: mockBudgetDisplayName,
            subsidyAccessPolicyUuid: mockBudgetUuid,
          },
        ],
      },
    });

    render(<BudgetCardWrapper
      budget={mockBudget}
      enterpriseUUID={enterpriseUUID}
      enterpriseSlug={enterpriseSlug}
    />);

    expect(screen.getByText(mockBudgetDisplayName)).toBeInTheDocument();
    expect(screen.queryByText('Executive Education')).not.toBeInTheDocument();
    const formattedString = `Expired ${dayjs(mockBudget.end).format('MMMM D, YYYY')}`;
    const elementsWithTestId = screen.getAllByTestId('budget-date');
    const firstElementWithTestId = elementsWithTestId[0];
    expect(firstElementWithTestId).toHaveTextContent(formattedString);

    // View budget CTA
    const viewBudgetCTA = screen.getByText('View budget', { selector: 'a' });
    expect(viewBudgetCTA).toBeInTheDocument();
    expect(viewBudgetCTA).toHaveAttribute('href', `/${enterpriseSlug}/admin/learner-credit/${mockBudgetUuid}`);

    // Aggregates
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(mockBudgetAggregates.available))).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(mockBudgetAggregates.spent))).toBeInTheDocument();
  });

  it.each([
    { isAssignableBudget: false },
    { isAssignableBudget: true },
  ])('displays correctly for Policy (enterprise-access) (%s)', ({ isAssignableBudget }) => {
    const mockBudgetAggregates = {
      total: 5000,
      spent: 200,
      pending: 100,
      available: isAssignableBudget ? 4700 : 4800,
    };
    const mockBudget = {
      id: mockBudgetUuid,
      name: mockBudgetDisplayName,
      start: '2022-01-01',
      end: '2023-01-01',
      source: BUDGET_TYPES.policy,
      aggregates: {
        available: mockBudgetAggregates.available,
        pending: isAssignableBudget ? mockBudgetAggregates.pending : undefined,
        spent: mockBudgetAggregates.spent,
      },
      isAssignable: isAssignableBudget,
    };
    useSubsidySummaryAnalyticsApi.mockReturnValue({
      isLoading: false,
      subsidySummary: undefined,
    });

    render(<BudgetCardWrapper
      budget={mockBudget}
      enterpriseUUID={enterpriseUUID}
      enterpriseSlug={enterpriseSlug}
    />);

    expect(screen.getByText(mockBudgetDisplayName)).toBeInTheDocument();
    expect(screen.queryByText('Executive Education')).not.toBeInTheDocument();
    const formattedString = `Expired ${dayjs(mockBudget.end).format('MMMM D, YYYY')}`;
    const elementsWithTestId = screen.getAllByTestId('budget-date');
    const firstElementWithTestId = elementsWithTestId[0];
    expect(firstElementWithTestId).toHaveTextContent(formattedString);

    // View budget CTA
    const viewBudgetCTA = screen.getByText('View budget', { selector: 'a' });
    expect(viewBudgetCTA).toBeInTheDocument();
    expect(viewBudgetCTA).toHaveAttribute('href', `/${enterpriseSlug}/admin/learner-credit/${mockBudgetUuid}`);

    // Aggregates
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(mockBudgetAggregates.available))).toBeInTheDocument();
    if (isAssignableBudget) {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText(formatPrice(mockBudgetAggregates.pending))).toBeInTheDocument();
    } else {
      expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    }
    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(screen.getByText(formatPrice(mockBudgetAggregates.spent))).toBeInTheDocument();
  });
});
