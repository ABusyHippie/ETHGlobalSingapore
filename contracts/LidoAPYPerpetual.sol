// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LidoAPYPerpetual
 * @dev A perpetual futures contract for betting on Lido Finance's APY
 */
contract LidoAPYPerpetual is ReentrancyGuard, Ownable {
    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_LEVERAGE = 100 * PRECISION; // 100x max leverage
    uint256 public constant LIQUIDATION_THRESHOLD = 80 * PRECISION / 100; // 80%
    uint256 public constant OPEN_FEE = 5 * PRECISION / 10000; // 0.05%
    uint256 public constant BORROW_RATE_PER_HOUR = 12 * PRECISION / 1000000; // 0.0012% per hour

    // Structs
    struct Token {
        IERC20 token;
        bool isEnabled;
    }

    struct Position {
        bool isLong;
        uint256 size;
        uint256 collateral;
        uint256 entryAPY;
        uint256 leverage;
        uint256 liquidationAPY;
        uint256 openTime;
        address tokenAddress;
        uint256 takeProfitAPY;
        uint256 stopLossAPY;
    }

    struct PoolInfo {
        uint256 longPoolSize;
        uint256 shortPoolSize;
    }

    // State variables
    mapping(address => Token) public supportedTokens;
    mapping(address => mapping(address => Position)) public positions;
    mapping(address => PoolInfo) public poolInfo;
    uint256 public currentAPY;

    // Events
    event PositionOpened(address indexed trader, address indexed token, bool isLong, uint256 size, uint256 collateral, uint256 leverage, uint256 entryAPY);
    event PositionClosed(address indexed trader, address indexed token, bool isLong, uint256 profit);
    event PositionLiquidated(address indexed trader, address indexed token, bool isLong, uint256 collateral);
    event APYUpdated(uint256 newAPY);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    /**
     * @dev Constructor that sets up RBTC as a supported token
     */
    constructor() {
        // Add RBTC as a supported token (address(0) represents the native token)
        supportedTokens[address(0)] = Token({token: IERC20(address(0)), isEnabled: true});
    }

    /**
     * @dev Fallback function to receive RBTC
     */
    receive() external payable {}

    /**
     * @dev Updates the current APY
     * @param _newAPY The new APY value
     */
    function updateAPY(uint256 _newAPY) external onlyOwner {
        currentAPY = _newAPY;
        emit APYUpdated(_newAPY);
    }

    /**
     * @dev Adds a new supported token
     * @param _tokenAddress The address of the token to add
     */
    function addSupportedToken(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        require(!supportedTokens[_tokenAddress].isEnabled, "Token already supported");
        supportedTokens[_tokenAddress] = Token({token: IERC20(_tokenAddress), isEnabled: true});
        emit TokenAdded(_tokenAddress);
    }

    /**
     * @dev Removes a supported token
     * @param _tokenAddress The address of the token to remove
     */
    function removeSupportedToken(address _tokenAddress) external onlyOwner {
        require(supportedTokens[_tokenAddress].isEnabled, "Token not supported");
        supportedTokens[_tokenAddress].isEnabled = false;
        emit TokenRemoved(_tokenAddress);
    }

        /**
     * @dev Opens a new position
     * @param _tokenAddress The address of the token used as collateral
     * @param _isLong Whether the position is long or short
     * @param _collateralAmount The amount of collateral
     * @param _leverage The leverage used for the position
     * @param _takeProfitAPY The take profit APY level
     * @param _stopLossAPY The stop loss APY level
     */
    function openPosition(
        address _tokenAddress,
        bool _isLong,
        uint256 _collateralAmount,
        uint256 _leverage,
        uint256 _takeProfitAPY,
        uint256 _stopLossAPY
    ) external payable nonReentrant {
        require(_leverage >= PRECISION && _leverage <= MAX_LEVERAGE, "Invalid leverage");
        require(_collateralAmount > 0, "Collateral must be greater than 0");
        require(positions[msg.sender][_tokenAddress].size == 0, "Position already exists");
        require(supportedTokens[_tokenAddress].isEnabled, "Token not supported");

        uint256 fee = (_collateralAmount * OPEN_FEE) / PRECISION;
        uint256 actualCollateral = _collateralAmount - fee;
        uint256 positionSize = actualCollateral * _leverage / PRECISION;

        // Handle RBTC and ERC20 tokens differently
        if (_tokenAddress == address(0)) {
            require(msg.value == _collateralAmount, "Incorrect RBTC amount");
        } else {
            require(msg.value == 0, "RBTC not accepted for this token");
            require(IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _collateralAmount), "Transfer failed");
        }

        // Calculate liquidation APY and update pool size
        uint256 liquidationAPY;
        if (_isLong) {
            liquidationAPY = currentAPY - (currentAPY * LIQUIDATION_THRESHOLD / _leverage);
            poolInfo[_tokenAddress].longPoolSize += positionSize;
        } else {
            liquidationAPY = currentAPY + (currentAPY * LIQUIDATION_THRESHOLD / _leverage);
            poolInfo[_tokenAddress].shortPoolSize += positionSize;
        }

        // Create and store the new position
        positions[msg.sender][_tokenAddress] = Position({
            isLong: _isLong,
            size: positionSize,
            collateral: actualCollateral,
            entryAPY: currentAPY,
            leverage: _leverage,
            liquidationAPY: liquidationAPY,
            openTime: block.timestamp,
            tokenAddress: _tokenAddress,
            takeProfitAPY: _takeProfitAPY,
            stopLossAPY: _stopLossAPY
        });

        emit PositionOpened(msg.sender, _tokenAddress, _isLong, positionSize, actualCollateral, _leverage, currentAPY);
    }

    /**
     * @dev Closes an existing position
     * @param _tokenAddress The address of the token used as collateral
     */
    function closePosition(address _tokenAddress) external nonReentrant {
        Position storage position = positions[msg.sender][_tokenAddress];
        require(position.size > 0, "No open position");

        int256 profit = calculateProfit(msg.sender, _tokenAddress);
        uint256 borrowFee = calculateBorrowFee(position);
        
        // Calculate the amount to return to the user
        uint256 amountToReturn;
        if (profit > 0) {
            amountToReturn = position.collateral + uint256(profit) - borrowFee;
        } else {
            amountToReturn = position.collateral > uint256(-profit) + borrowFee ? 
                             position.collateral - uint256(-profit) - borrowFee : 0;
        }

        // Update pool size
        if (position.isLong) {
            poolInfo[_tokenAddress].longPoolSize -= position.size;
        } else {
            poolInfo[_tokenAddress].shortPoolSize -= position.size;
        }

        // Clear the position
        delete positions[msg.sender][_tokenAddress];

                // Transfer funds back to the user
        if (_tokenAddress == address(0)) {
            (bool success, ) = msg.sender.call{value: amountToReturn}("");
            require(success, "Transfer failed");
        } else {
            require(IERC20(_tokenAddress).transfer(msg.sender, amountToReturn), "Transfer failed");
        }

        emit PositionClosed(msg.sender, _tokenAddress, position.isLong, amountToReturn > position.collateral ? amountToReturn - position.collateral : 0);
    }

    /**
     * @dev Liquidates a position if conditions are met
     * @param _trader The address of the trader whose position is being liquidated
     * @param _tokenAddress The address of the token used as collateral
     */
    function liquidatePosition(address _trader, address _tokenAddress) external nonReentrant {
        Position storage position = positions[_trader][_tokenAddress];
        require(position.size > 0, "No open position");

        // Check if the position should be liquidated
        bool shouldLiquidate = (position.isLong && currentAPY <= position.liquidationAPY) ||
                               (!position.isLong && currentAPY >= position.liquidationAPY) ||
                               (position.takeProfitAPY > 0 && ((position.isLong && currentAPY >= position.takeProfitAPY) ||
                                                               (!position.isLong && currentAPY <= position.takeProfitAPY))) ||
                               (position.stopLossAPY > 0 && ((position.isLong && currentAPY <= position.stopLossAPY) ||
                                                             (!position.isLong && currentAPY >= position.stopLossAPY)));

        require(shouldLiquidate, "Position is not liquidatable");

        uint256 borrowFee = calculateBorrowFee(position);
        uint256 remainingCollateral = position.collateral > borrowFee ? position.collateral - borrowFee : 0;

        // Update pool size
        if (position.isLong) {
            poolInfo[_tokenAddress].longPoolSize -= position.size;
        } else {
            poolInfo[_tokenAddress].shortPoolSize -= position.size;
        }

        // Clear the position
        delete positions[_trader][_tokenAddress];

        // Transfer remaining collateral to the liquidator
        if (remainingCollateral > 0) {
            if (_tokenAddress == address(0)) {
                (bool success, ) = msg.sender.call{value: remainingCollateral}("");
                require(success, "Transfer failed");
            } else {
                require(IERC20(_tokenAddress).transfer(msg.sender, remainingCollateral), "Transfer failed");
            }
        }

        emit PositionLiquidated(_trader, _tokenAddress, position.isLong, remainingCollateral);
    }

    /**
     * @dev Calculates the profit of a position
     * @param _trader The address of the trader
     * @param _tokenAddress The address of the token used as collateral
     * @return The profit (positive) or loss (negative)
     */
    function calculateProfit(address _trader, address _tokenAddress) public view returns (int256) {
        Position storage position = positions[_trader][_tokenAddress];
        if (position.size == 0) return 0;

        int256 apyDifference = int256(currentAPY) - int256(position.entryAPY);
        if (!position.isLong) {
            apyDifference = -apyDifference;
        }

        return (apyDifference * int256(position.size)) / int256(PRECISION);
    }

    /**
     * @dev Calculates the borrow fee for a position
     * @param _position The position to calculate the fee for
     * @return The borrow fee
     */
    function calculateBorrowFee(Position storage _position) internal view returns (uint256) {
        uint256 hoursPassed = (block.timestamp - _position.openTime) / 1 hours;
        return (_position.size * BORROW_RATE_PER_HOUR * hoursPassed) / PRECISION;
    }

        /**
     * @dev Retrieves a position for a given trader and token
     * @param _trader The address of the trader
     * @param _tokenAddress The address of the token used as collateral
     * @return The position details
     */
    function getPosition(address _trader, address _tokenAddress) external view returns (Position memory) {
        return positions[_trader][_tokenAddress];
    }

    /**
     * @dev Retrieves the available liquidity for a given token and position type
     * @param _tokenAddress The address of the token
     * @param _isLong Whether to get liquidity for long or short positions
     * @return The available liquidity
     */
    function getAvailableLiquidity(address _tokenAddress, bool _isLong) external view returns (uint256) {
        return _isLong ? poolInfo[_tokenAddress].longPoolSize : poolInfo[_tokenAddress].shortPoolSize;
    }

    /**
     * @dev Calculates the price impact of opening a position
     * @param _tokenAddress The address of the token
     * @param _isLong Whether the position is long or short
     * @param _positionSize The size of the position
     * @return The price impact
     */
    function calculatePriceImpact(address _tokenAddress, bool _isLong, uint256 _positionSize) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_tokenAddress];
        uint256 totalPoolSize = pool.longPoolSize + pool.shortPoolSize;
        uint256 targetPoolSize = _isLong ? pool.longPoolSize : pool.shortPoolSize;
        
        if (totalPoolSize == 0) return 0;
        
        uint256 impact = (_positionSize * PRECISION) / totalPoolSize;
        return (impact * (totalPoolSize - targetPoolSize)) / totalPoolSize;
    }
}